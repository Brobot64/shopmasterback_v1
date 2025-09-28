import { AppDataSource } from '../database/data-source';
import { User, UserRole, UserStatus } from '../database/entities/User';
import { Business } from '../database/entities/Business';
import { hashPassword, comparePassword } from '../utils/password.utils';
import { generateToken } from '../utils/jwt.utils';
import ApiError, { ConflictError, NotFoundError, UnauthorizedError, ForbiddenError } from '../utils/apiError';
import { logger } from '../utils/logger';
import notificationService from './notification.service';
import otpService from './otp.service';

class AuthService {
    private userRepository = AppDataSource.getRepository(User);
    private businessRepository = AppDataSource.getRepository(Business);

    async registerOwner(userData: any, businessData: any): Promise<{ user: User; business: Business }> {
        const { email, password, firstName, lastName, phone } = userData;
        const { name, category, address, yearOfEstablishment, contact, imageUrl, description } = businessData;

        // 1. Check if user or business already exists
        const existingUser = await this.userRepository.findOneBy({ email });
        if (existingUser) {
            throw new ConflictError('User with this email already exists.');
        }
        const existingBusiness = await this.businessRepository.findOneBy({ name });
        if (existingBusiness) {
            throw new ConflictError('Business with this name already exists.');
        }

        // 2. Hash password
        const hashedPassword = await hashPassword(password);

        // 3. Create user (initially inactive, pending OTP verification)
        const newUser = this.userRepository.create({
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword,
            userType: UserRole.OWNER,
            status: UserStatus.INACTIVE, // Set to inactive until verified
        });

        // 4. Generate and send OTP
        const otp = await otpService.generateOtp();
        console.log(
            "\n\n======>\n", otp, "\n\n=======>\n"
        )
        await otpService.saveOtp(email, String(otp));

        // Send OTP via email
        await notificationService.sendEmail({
            to: email,
            subject: 'ShopMaster Account Verification OTP',
            html: `<p>Your OTP for ShopMaster registration is: <strong>${otp}</strong></p><p>This OTP is valid for 5 minutes.</p>`,
        });

        // Send OTP via SMS (if phone is provided)
        // if (phone) {
        //     await notificationService.sendSms({
        //         to: phone,
        //         message: `Your ShopMaster OTP: ${otp}. Valid for 5 mins.`,
        //     });
        // }

        // Save user and business after OTP is sent, but user status remains INACTIVE
        // The business will be linked and activated upon successful OTP verification
        const savedUser = await this.userRepository.save(newUser);

        const newBusiness = this.businessRepository.create({
            name,
            category,
            address,
            email,
            yearOfEstablishment,
            contact,
            imageUrl,
            description,
            owner: savedUser, // Link owner to business
            ownerId: savedUser.id,
            activeSubStatus: false, // No active subscription initially
            status: 'pending_verification', // Business status also pending
        });
        const savedBusiness = await this.businessRepository.save(newBusiness);

        // Update user with businessId
        savedUser.business = savedBusiness;
        savedUser.businessId = savedBusiness.id;
        await this.userRepository.save(savedUser);

        logger.info(`Owner registration initiated for ${email}. OTP sent.`);
        return { user: savedUser, business: savedBusiness };
    }

    async verifyOwnerRegistration(email: string, otp: string): Promise<{ token: string; user: User }> {
        const user = await this.userRepository.findOne({ where: { email, userType: UserRole.OWNER } });

        if (!user) {
            throw new ApiError('User not found or not an owner.', 404);
        }
        if (user.status === UserStatus.ACTIVE) {
            throw new ApiError('Account already verified.', 400);
        }

        const isOtpValid = await otpService.verifyOtp(email, otp);
        if (!isOtpValid) {
            throw new ApiError('Invalid or expired OTP.', 400);
        }

        // Activate user and business
        user.status = UserStatus.ACTIVE;
        await this.userRepository.save(user);

        if (user.businessId) {
            const business = await this.businessRepository.findOneBy({ id: user.businessId });
            if (business) {
                business.status = 'active';
                await this.businessRepository.save(business);
            }
        }

        const token = generateToken({
            id: user.id,
            email: user.email,
            userType: user.userType,
            businessId: user.businessId,
        });

        logger.info(`Owner ${email} successfully verified and activated.`);
        return { token, user };
    }

    async login(email: string, password: string): Promise<{ token: string; user: User }> {
        const user = await this.userRepository.findOne({
            where: { email },
            select: ['id', 'email', 'password', 'userType', 'businessId', 'outletId', 'status', 'firstName', 'lastName'],
        });

        if (!user || !(await comparePassword(password, user.password))) {
            throw new ApiError('Invalid credentials', 401);
        }

        if (user.status === UserStatus.INACTIVE) {
            throw new ApiError('Account not verified. Please verify your email.', 403);
        }
        if (user.status === UserStatus.SUSPENDED) {
            throw new ApiError('Account suspended. Please contact support.', 403);
        }

        user.lastLogin = new Date();
        await this.userRepository.save(user);

        const token = generateToken({
            id: user.id,
            email: user.email,
            userType: user.userType,
            businessId: user.businessId,
            firstName: user.firstName,
            lastName: user.lastName,
            outletId: user.outletId,
        });

        logger.info(`User ${email} logged in successfully.`);
        return { token, user };
    }
}

export default new AuthService();
