import { Business } from '../database/entities/Business';

const businessToSafeDTO = (business: Business) => {
    if (!business) return null;

    return {
        id: business.id,
        name: business.name,
        yearOfEstablishment: business.yearOfEstablishment,
        category: business.category,
        description: business.description,
        address: business.address,
        email: business.email,
        contact: business.contact,
        imageUrl: business.imageUrl,
        nextSubRenewal: business.nextSubRenewal,
        activeSubStatus: business.activeSubStatus,
        status: business.status,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt,

        owner: business.owner ? {
            id: business.owner.id,
            firstName: business.owner.firstName,
            lastName: business.owner.lastName,
            email: business.owner.email,
            phone: business.owner.phone,
            password: "",
            userType: business.owner.userType,
            status: business.owner.status,
            lastLogin: business.owner.lastLogin,
            createdAt: business.owner.createdAt,
            updatedAt: business.owner.updatedAt,
        } : null,

        subscription: business.subscription ? {
            id: business.subscription.id,
            title: business.subscription.title,
            amount: business.subscription.amount,
            duration: business.subscription.duration,
            isBulkDiscount: business.subscription.isBulkDiscount,
            bulkDiscountPercent: business.subscription?.bulkDiscountPercentage,
            features: business.subscription.features,
            description: business.subscription.description,
            createdAt: business.subscription.createdAt,
            updatedAt: business.subscription.updatedAt
        } : null,

        outlets: business.outlets?.map(outlet => ({
            id: outlet.id,
            name: outlet.name,
            address: outlet.address,
            email: outlet.email,
            phone: outlet.phone,
            status: outlet.status,
            createdAt: outlet.createdAt,
            updatedAt: outlet.updatedAt,
        })) || [],

        users: business.users?.map(user => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            userType: user.userType,
            password: "",
            status: user.status,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        })) || [],
    };
};


export{ businessToSafeDTO };
