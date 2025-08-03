const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }
    
    req.body = value;
    next();
  };
};

const campaignSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().allow('').optional(),
  imageUrl: Joi.string().uri().allow('').optional(),
  targetAmount: Joi.number().min(0).required(),
  maxParticipants: Joi.number().integer().min(1).optional(),
  ticketAmount: Joi.number().min(0).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  prizes: Joi.array().items(Joi.object({
    place: Joi.number().integer().min(1).required(),
    amount: Joi.number().min(0).required(),
    description: Joi.string().allow('').optional(),
  })).optional(),
  offchainTasks: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid(
      'twitter_follow',
      'twitter_retweet', 
      'twitter_like',
      'discord_join',
      'telegram_join',
      'email_subscribe',
      'website_visit',
      'custom'
    ).required(),
    label: Joi.string().required(),
    required: Joi.boolean().default(true),
    targetAccount: Joi.string().optional(),
    targetUrl: Joi.string().uri().optional(),
    description: Joi.string().allow('').optional(),
  })).optional(),
});

const stakeSchema = Joi.object({
  campaignId: Joi.string().uuid().required(),
  amount: Joi.number().min(0).required(),
  transactionHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).optional(),
});

const taskSubmissionSchema = Joi.object({
  campaignId: Joi.string().uuid().required(),
  taskId: Joi.string().required(),
  submissionData: Joi.object().optional(),
});

const userUpdateSchema = Joi.object({
  username: Joi.string().min(3).max(50).optional(),
  email: Joi.string().email().optional(),
  profileImage: Joi.string().uri().optional(),
  socialProfiles: Joi.object().optional(),
  preferences: Joi.object().optional(),
});

module.exports = {
  validateRequest,
  campaignSchema,
  stakeSchema,
  taskSubmissionSchema,
  userUpdateSchema,
};