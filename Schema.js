const Joi = require('joi');
const review = require('./models/review');

module.exports.listingSchema = Joi.object({
    listing : Joi.object({
        title: Joi.string().required(),
        description: Joi.string().allow("", null),
        location: Joi.string().allow("", null),
        country: Joi.string().allow("", null),
        price: Joi.number().min(0).allow("", null),
        image: Joi.string().allow("", null),
        author: Joi.string().allow("", null),
        category: Joi.string().allow("", null),
        totalQuantity: Joi.number().min(1).allow("", null),
        availableQuantity: Joi.number().min(0).allow("", null),
        isbn: Joi.string().allow("", null),
        publisher: Joi.string().allow("", null),
        publishedYear: Joi.number().allow("", null),
        language: Joi.string().allow("", null),
        pages: Joi.number().allow("", null),
        tags: Joi.string().allow("", null),
    }).unknown(true).required()
}).unknown(true);

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().required(),
    }).required(),
});