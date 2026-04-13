/**
 * COMPREHENSIVE Swagger Specification with Request/Response Schemas
 * 231+ API Endpoints with full payload definitions
 * Last Updated: 2026-03-27
 */

// Schema Definitions
export const correctSchemas = {
  User: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      email: { type: 'string', format: 'email' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      phone: { type: 'string' },
      role: { type: 'string', enum: ['brand', 'influencer', 'admin'] },
      profileImage: { type: 'string' },
      bio: { type: 'string' },
      location: { type: 'string' },
      verified: { type: 'boolean' },
      credits: { type: 'number' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },
  Campaign: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      brand: { type: 'string' },
      budget: { type: 'number' },
      duration: { type: 'string' },
      requirements: { type: 'array', items: { type: 'string' } },
      status: { type: 'string', enum: ['active', 'closed', 'pending'] },
      applications: { type: 'number' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },
  GenderDistribution: {
    type: 'object',
    properties: {
      gender: { type: 'string' },
      distribution: { type: 'number' }
    }
  },
  AgeDistribution: {
    type: 'object',
    properties: {
      age: { type: 'string' },
      value: { type: 'number' }
    }
  },
  AudienceByCountry: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      name: { type: 'string' },
      value: { type: 'number' }
    }
  },
  AudienceByCity: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      value: { type: 'number' }
    }
  },
  LanguageDistribution: {
    type: 'object',
    properties: {
      language: { type: 'string' },
      value: { type: 'number' }
    }
  },
  CollaborationCharges: {
    type: 'object',
    properties: {
      reel: { type: 'number' },
      story: { type: 'number' },
      post: { type: 'number' },
      oneMonthDigitalRights: { type: 'number' }
    }
  },
  SocialMediaData: {
    type: 'object',
    properties: {
      followers: { type: 'number' },
      following: { type: 'number' },
      posts_count: { type: 'number' },
      avg_engagement: { type: 'number' },
      link: { type: 'string' },
      genderDistribution: {
        type: 'array',
        items: { $ref: '#/components/schemas/GenderDistribution' }
      },
      ageDistribution: {
        type: 'array',
        items: { $ref: '#/components/schemas/AgeDistribution' }
      },
      audienceByCountry: {
        type: 'array',
        items: { $ref: '#/components/schemas/AudienceByCountry' }
      },
      audienceByCity: {
        type: 'array',
        items: { $ref: '#/components/schemas/AudienceByCity' }
      },
      languageDistribution: {
        type: 'array',
        items: { $ref: '#/components/schemas/LanguageDistribution' }
      },
      audienceQualityScore: { type: 'number' },
      fakeFollowersPercent: { type: 'number' },
      totalCommentsAnalyzed: { type: 'number' },
      realUsersAnalyzed: { type: 'number' },
      collaborationCharges: { $ref: '#/components/schemas/CollaborationCharges' }
    }
  },
  Influencer: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      name: { type: 'string' },
      categoryInstagram: { type: 'string' },
      categoryYouTube: { type: 'string' },
      user_name: { type: 'string' },
      profile_name: { type: 'string' },
      profile_pic_url: { type: 'string' },
      biography: { type: 'string' },
      is_verified: { type: 'boolean' },
      is_business: { type: 'boolean' },
      city: { type: 'string' },
      state: { type: 'string' },
      language: { type: 'string' },
      gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
      lastDemographicsFetch: { type: 'string', format: 'date-time' },
      instagramData: { $ref: '#/components/schemas/SocialMediaData' },
      youtubeData: { $ref: '#/components/schemas/SocialMediaData' },
      averageLikes: { type: 'number' },
      averageViews: { type: 'number' },
      averageComments: { type: 'number' },
      averageEngagement: { type: 'number' },
      image: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },
  ErrorResponse: {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
      statusCode: { type: 'number' }
    }
  },
  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      data: { type: 'object' }
    }
  }
};

export const correctPaths = {
  // ============ AUTHENTICATION (10 endpoints) ============
  '/api/auth/signup': {
    post: {
      tags: ['Authentication'],
      summary: 'User Registration',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', format: 'password', example: 'SecurePass123!' },
                    type: { type: 'string', enum: ['USER'], example: 'USER' },
                    name: { type: 'string', example: 'John Doe' },
                    username: { type: 'string', example: 'johndoe' },
                    gender: { type: 'string', enum: ['Male', 'Female', 'Other'], example: 'Male' },
                    phoneNumber: { type: 'string', example: '+1234567890' }
                  },
                  required: ['email', 'password', 'type', 'name', 'username']
                },
                {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email', example: 'creator@example.com' },
                    password: { type: 'string', format: 'password', example: 'SecurePass123!' },
                    type: { type: 'string', enum: ['INFLUENCER'], example: 'INFLUENCER' },
                    name: { type: 'string', example: 'Creator Name' },
                    username: { type: 'string', example: 'creatorhandle' },
                    bio: { type: 'string', example: 'Content creator bio' },
                    profilePicture: { type: 'string', example: 'https://example.com/profile.jpg' }
                  },
                  required: ['email', 'password', 'type', 'name', 'username']
                },
                {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email', example: 'service@example.com' },
                    password: { type: 'string', format: 'password', example: 'SecurePass123!' },
                    type: { type: 'string', enum: ['SERVICE_PROVIDER'], example: 'SERVICE_PROVIDER' },
                    companyName: { type: 'string', example: 'Acme Services' },
                    services: { type: 'array', items: { type: 'string' }, example: ['Editing', 'Production'] },
                    description: { type: 'string', example: 'Service provider description' }
                  },
                  required: ['email', 'password', 'type', 'companyName']
                },
                {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email', example: 'brand@example.com' },
                    password: { type: 'string', format: 'password', example: 'SecurePass123!' },
                    type: { type: 'string', enum: ['BRAND'], example: 'BRAND' }
                  },
                  required: ['email', 'password', 'type']
                }
              ]
            }
          }
        }
      },
      responses: {
        201: {
          description: 'User registered successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  email: { type: 'string', format: 'email' }
                }
              }
            }
          }
        },
        400: { description: 'Validation error' },
        409: { description: 'User already exists' }
      }
    }
  },

  '/api/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'User Login',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email', example: 'user@example.com' },
                password: { type: 'string', format: 'password', example: 'SecurePass123!' }
              },
              required: ['email', 'password']
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                  user: {
                    type: 'object',
                    additionalProperties: true
                  }
                }
              }
            }
          }
        },
        401: { description: 'Invalid credentials' },
        404: { description: 'User not found' }
      }
    }
  },

  '/api/auth/forgot-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Request Password Reset',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email', example: 'user@example.com' }
              },
              required: ['email']
            }
          }
        }
      },
      responses: {
        200: { description: 'Password reset email sent' },
        404: { description: 'User not found' }
      }
    }
  },

  '/api/auth/reset-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Reset Password After Code Verification',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email', example: 'user@example.com' },
                newPassword: { type: 'string', format: 'password', example: 'NewSecurePass123!' }
              },
              required: ['email', 'newPassword']
            }
          }
        }
      },
      responses: {
        200: { description: 'Password reset successfully' },
        400: { description: 'User not found or code not verified' }
      }
    }
  },

  '/api/auth/verify-otp': {
    post: {
      tags: ['Authentication'],
      summary: 'Verify OTP',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                otp: { type: 'string', example: '123456' }
              },
              required: ['email', 'otp']
            }
          }
        }
      },
      responses: {
        200: { description: 'OTP verified' },
        400: { description: 'Invalid OTP' }
      }
    }
  },

  '/api/auth/resend-otp': {
    post: {
      tags: ['Authentication'],
      summary: 'Resend OTP',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' }
              },
              required: ['email']
            }
          }
        }
      },
      responses: {
        200: { description: 'OTP sent' },
        404: { description: 'User not found' }
      }
    }
  },

  '/api/auth/google': {
    post: {
      tags: ['Authentication'],
      summary: 'Google OAuth Login/Signup',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                idToken: { type: 'string', example: 'google-id-token' },
                type: { type: 'string', enum: ['BRAND', 'INFLUENCER', 'SERVICE_PROVIDER', 'USER'], example: 'USER' },
                gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
                phoneNumber: { type: 'string', example: '+1234567890' }
              },
              required: ['idToken', 'type']
            }
          }
        }
      },
      responses: {
        200: { description: 'Google authentication successful' },
        400: { description: 'Invalid token' }
      }
    }
  },

  '/api/auth/google/callback': {
    get: {
      tags: ['Authentication'],
      summary: 'Google OAuth Callback',
      parameters: [
        { name: 'code', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Callback processed' }
      }
    }
  },

  '/api/auth/registration-status': {
    get: {
      tags: ['Authentication'],
      summary: 'Check Registration Status',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Status retrieved' }
      }
    }
  },

  // ============ USERS (8 endpoints) ============
  '/api/users/profile': {
    get: {
      tags: ['Users'],
      summary: 'Get User Profile',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'User profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  data: {
                    type: 'object',
                    additionalProperties: true
                  }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized' }
      }
    },
    patch: {
      tags: ['Users'],
      summary: 'Update Profile',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                bio: { type: 'string' },
                location: { type: 'string' },
                phone: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Profile updated' },
        400: { description: 'Validation error' }
      }
    },
    delete: {
      tags: ['Users'],
      summary: 'Delete Account',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Account deleted' }
      }
    }
  },

  '/api/users/change-password': {
    put: {
      tags: ['Users'],
      summary: 'Change Password',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                currentPassword: { type: 'string', format: 'password' },
                newPassword: { type: 'string', format: 'password' },
                confirmPassword: { type: 'string', format: 'password' }
              },
              required: ['currentPassword', 'newPassword', 'confirmPassword']
            }
          }
        }
      },
      responses: {
        200: { description: 'Password changed' },
        401: { description: 'Current password incorrect' }
      }
    }
  },

  '/api/users/upload-avatar': {
    post: {
      tags: ['Users'],
      summary: 'Upload Avatar',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: { type: 'string', format: 'binary' }
              },
              required: ['file']
            }
          }
        }
      },
      responses: {
        200: { description: 'Avatar uploaded' },
        400: { description: 'Invalid file' }
      }
    }
  },

  '/api/users/location': {
    post: {
      tags: ['Users'],
      summary: 'Update Location',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                city: { type: 'string' },
                country: { type: 'string' }
              },
              required: ['latitude', 'longitude']
            }
          }
        }
      },
      responses: {
        200: { description: 'Location updated' }
      }
    }
  },

  '/api/users/search': {
    get: {
      tags: ['Users'],
      summary: 'Search Users',
      parameters: [
        { name: 'q', in: 'query', schema: { type: 'string' } },
        { name: 'role', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Search results' }
      }
    }
  },

  '/api/users/list': {
    get: {
      tags: ['Users'],
      summary: 'List Users',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        200: { description: 'Users list' }
      }
    }
  },

  '/api/users/{id}': {
    get: {
      tags: ['Users'],
      summary: 'Get User by ID',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'User details' },
        404: { description: 'User not found' }
      }
    }
  },

  // ============ CAMPAIGNS (21 endpoints) ============
  '/api/campaigns': {
    get: {
      tags: ['Campaigns'],
      summary: 'List Campaigns',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'status', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Campaigns list' }
      }
    },
    post: {
      tags: ['Campaigns'],
      summary: 'Create Campaign (5 credits)',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string', example: 'Summer Product Launch' },
                description: { type: 'string' },
                budget: { type: 'number', example: 5000 },
                duration: { type: 'string', example: '30 days' },
                targetAudience: { type: 'string' },
                requirements: { type: 'array', items: { type: 'string' } },
                deliverables: { type: 'array', items: { type: 'string' } },
                category: { type: 'string' },
                status: { type: 'string', enum: ['draft', 'active', 'closed'] }
              },
              required: ['title', 'description', 'budget', 'duration']
            }
          }
        }
      },
      responses: {
        201: { description: 'Campaign created' },
        400: { description: 'Validation error' },
        402: { description: 'Insufficient credits' }
      }
    }
  },

  '/api/campaigns/mine': {
    get: {
      tags: ['Campaigns'],
      summary: 'My Campaigns',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'User campaigns' }
      }
    }
  },

  '/api/campaigns/trending/for-me': {
    get: {
      tags: ['Campaigns'],
      summary: 'Trending Campaigns for Me',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Trending campaigns' }
      }
    }
  },

  '/api/campaigns/{id}': {
    get: {
      tags: ['Campaigns'],
      summary: 'Get Campaign Details',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Campaign details' },
        404: { description: 'Campaign not found' }
      }
    },
    patch: {
      tags: ['Campaigns'],
      summary: 'Update Campaign (Partial)',
      security: [{ BearerAuth: [] }],
      description: 'Partially update a campaign owned by the authenticated brand. Restricted fields like brandId, applicants, selectedInfluencers, suggestedInfluencers, aiSuggestionMetadata, and timestamps cannot be updated.',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              minProperties: 1,
              properties: {
                campaignName: { type: 'string', example: 'Summer Fashion Campaign v2' },
                campaignType: { type: 'string', example: 'Product Promotion' },
                campaignBrief: { type: 'string', example: 'Updated campaign brief' },
                deliverables: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['1 Instagram Post', '1 Reel']
                },
                compensation: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['Monetary', 'Barter/Gifting', 'Affiliate/Commission']
                    },
                    amount: { type: 'number', minimum: 0 },
                    currency: { type: 'string', example: 'USD' },
                    description: { type: 'string' },
                    commissionRate: { type: 'number', minimum: 0, maximum: 100 },
                    giftValue: { type: 'number', minimum: 0 },
                    products: { type: 'array', items: { type: 'string' } }
                  }
                },
                budget: { type: 'number', minimum: 0, example: 650 },
                timelines: {
                  type: 'object',
                  properties: {
                    applicationDeadline: { type: 'string', format: 'date-time' },
                    campaignStartDate: { type: 'string', format: 'date-time' },
                    campaignEndDate: { type: 'string', format: 'date-time' }
                  }
                },
                targetInfluencer: {
                  type: 'object',
                  properties: {
                    numberOfInfluencers: { type: 'integer', minimum: 1 },
                    targetNiche: { type: 'array', items: { type: 'string' } },
                    followerCount: {
                      type: 'object',
                      properties: {
                        min: { type: 'number', minimum: 0 },
                        max: { type: 'number', minimum: 0 }
                      }
                    },
                    countries: { type: 'array', items: { type: 'string' } },
                    gender: {
                      type: 'array',
                      items: { type: 'string', enum: ['Male', 'Female', 'Other'] }
                    },
                    ageRange: {
                      type: 'object',
                      properties: {
                        min: { type: 'integer', minimum: 13, maximum: 100 },
                        max: { type: 'integer', minimum: 13, maximum: 100 }
                      }
                    }
                  }
                },
                numberOfLivePosts: { type: 'integer', minimum: 0, example: 1 },
                reels: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['https://example.com/reel1.mp4']
                },
                status: {
                  type: 'string',
                  enum: ['Draft', 'Active', 'Paused', 'Completed', 'Cancelled']
                },
                productImages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Provide image URLs when using JSON payload'
                }
              },
              additionalProperties: false
            }
          },
          'multipart/form-data': {
            schema: {
              type: 'object',
              minProperties: 1,
              properties: {
                productImages: {
                  type: 'array',
                  items: { type: 'string', format: 'binary' },
                  description: 'Upload up to 10 image files'
                },
                campaignName: { type: 'string' },
                campaignType: { type: 'string' },
                campaignBrief: { type: 'string' },
                deliverables: {
                  type: 'string',
                  description: 'JSON string, e.g. ["1 Post","1 Reel"]'
                },
                compensation: {
                  type: 'string',
                  description: 'JSON string object'
                },
                budget: {
                  type: 'string',
                  description: 'Numeric value as text, e.g. "650"'
                },
                timelines: {
                  type: 'string',
                  description: 'JSON string object with ISO date-time values'
                },
                targetInfluencer: {
                  type: 'string',
                  description: 'JSON string object'
                },
                numberOfLivePosts: {
                  type: 'string',
                  description: 'Numeric value as text, e.g. "1"'
                },
                reels: {
                  type: 'string',
                  description: 'JSON string array'
                },
                status: {
                  type: 'string',
                  enum: ['Draft', 'Active', 'Paused', 'Completed', 'Cancelled']
                }
              },
              additionalProperties: false
            }
          }
        }
      },
      responses: {
        200: { description: 'Campaign updated successfully' },
        400: { description: 'Validation error / invalid patch body' },
        401: { description: 'Unauthorized' },
        404: { description: 'Campaign not found or no permission' }
      }
    },
    delete: {
      tags: ['Campaigns'],
      summary: 'Delete Campaign',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Campaign deleted' },
        400: { description: 'Invalid campaign ID format' },
        404: { description: 'Campaign not found' }
      }
    }
  },

  '/api/campaigns/{id}/apply': {
    post: {
      tags: ['Campaigns'],
      summary: 'Apply to Campaign (1 credit)',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                portfolio: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Application submitted' },
        402: { description: 'Insufficient credits' }
      }
    }
  },

  '/api/campaigns/{id}/select': {
    post: {
      tags: ['Campaigns'],
      summary: 'Select Influencer (2 credits)',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                influencerId: { type: 'string' },
                offer: { type: 'number' }
              },
              required: ['influencerId']
            }
          }
        }
      },
      responses: {
        200: { description: 'Influencer selected' },
        402: { description: 'Insufficient credits' }
      }
    }
  },

  '/api/campaigns/{id}/applications': {
    get: {
      tags: ['Campaigns'],
      summary: 'Get Campaign Applications',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Applications list' }
      }
    }
  },

  '/api/campaigns/{id}/applications/{applicationId}/accept': {
    post: {
      tags: ['Campaigns'],
      summary: 'Accept Application',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'applicationId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Application accepted' }
      }
    }
  },

  '/api/campaigns/{id}/applications/{applicationId}/reject': {
    post: {
      tags: ['Campaigns'],
      summary: 'Reject Application',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'applicationId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Application rejected' }
      }
    }
  },

  '/api/campaigns/{id}/deliverables': {
    get: {
      tags: ['Campaigns'],
      summary: 'Get Deliverables',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Deliverables list' }
      }
    },
    post: {
      tags: ['Campaigns'],
      summary: 'Add Deliverable',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                dueDate: { type: 'string', format: 'date' },
                content: { type: 'string' }
              },
              required: ['title', 'dueDate']
            }
          }
        }
      },
      responses: {
        201: { description: 'Deliverable added' }
      }
    }
  },

  '/api/campaigns/{id}/counter-offer': {
    post: {
      tags: ['Campaigns'],
      summary: 'Make Counter Offer',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                influencerId: { type: 'string' },
                amount: { type: 'number' }
              },
              required: ['influencerId', 'amount']
            }
          }
        }
      },
      responses: {
        200: { description: 'Counter offer made' }
      }
    }
  },

  '/api/campaigns/{id}/negotiations/{influencerId}': {
    get: {
      tags: ['Campaigns'],
      summary: 'Get Negotiation Details',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'influencerId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Negotiation details' }
      }
    }
  },

  '/api/campaigns/{id}/negotiations/{influencerId}/accept': {
    post: {
      tags: ['Campaigns'],
      summary: 'Accept Negotiation',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'influencerId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Negotiation accepted' }
      }
    }
  },

  '/api/campaigns/{id}/negotiations/{influencerId}/reject': {
    post: {
      tags: ['Campaigns'],
      summary: 'Reject Negotiation',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'influencerId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Negotiation rejected' }
      }
    }
  },

  '/api/campaigns/{id}/boost': {
    post: {
      tags: ['Campaigns'],
      summary: 'Boost Campaign',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                duration: { type: 'string', enum: ['7days', '14days', '30days'] },
                amount: { type: 'number' }
              },
              required: ['duration']
            }
          }
        }
      },
      responses: {
        200: { description: 'Campaign boosted' }
      }
    }
  },

  '/api/campaigns/{id}/boost-recommendations': {
    get: {
      tags: ['Campaigns'],
      summary: 'Boost Recommendations',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Recommendations' }
      }
    }
  },

  // ============ INFLUENCERS (12 endpoints) ============
  '/api/influencers/search': {
    post: {
      tags: ['Influencers'],
      summary: 'Search Influencers (100% Accurate)',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                category: { type: 'string' },
                minFollowers: { type: 'number' },
                maxFollowers: { type: 'number' },
                engagement: { type: 'number' },
                location: { type: 'string' },
                platforms: { type: 'array', items: { type: 'string' } }
              },
              required: ['query']
            }
          }
        }
      },
      responses: {
        200: { description: 'Search results' },
        402: { description: 'Insufficient credits' }
      }
    }
  },

  '/api/influencers/popular': {
    get: {
      tags: ['Influencers'],
      summary: 'Popular Influencers',
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        200: { description: 'Popular influencers' }
      }
    }
  },

  '/api/influencers/nearby': {
    get: {
      tags: ['Influencers'],
      summary: 'Nearby Influencers',
      parameters: [
        { name: 'latitude', in: 'query', schema: { type: 'number' } },
        { name: 'longitude', in: 'query', schema: { type: 'number' } },
        { name: 'radius', in: 'query', schema: { type: 'number', default: 10 } }
      ],
      responses: {
        200: { description: 'Nearby influencers' }
      }
    }
  },

  '/api/influencers/stats': {
    get: {
      tags: ['Influencers'],
      summary: 'Influencer Statistics',
      responses: {
        200: { description: 'Statistics' }
      }
    }
  },

  '/api/influencers': {
    get: {
      tags: ['Influencers'],
      summary: 'List All Influencers',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        200: { description: 'Influencers list' }
      }
    },
    post: {
      tags: ['Influencers'],
      summary: 'Create Influencer Profile',
      description: 'Create an influencer with any subset of influencerSchema fields. All profile fields are optional.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Influencer'
            }
          }
        }
      },
      responses: {
        201: { description: 'Profile created' }
      }
    }
  },

  '/api/influencers/{id}': {
    get: {
      tags: ['Influencers'],
      summary: 'Get Influencer Details (1 credit)',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Influencer details' },
        402: { description: 'Insufficient credits' }
      }
    },
    patch: {
      tags: ['Influencers'],
      summary: 'Update Influencer',
      description: 'Update an influencer by MongoDB _id using any subset of influencerSchema fields.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Influencer MongoDB ObjectId (_id)',
          schema: {
            type: 'string',
            pattern: '^[a-fA-F0-9]{24}$',
            example: '507f1f77bcf86cd799439011'
          }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Influencer'
            }
          }
        }
      },
      responses: {
        200: { description: 'Updated' }
      }
    },
    delete: {
      tags: ['Influencers'],
      summary: 'Delete Influencer',
      description: 'Delete an influencer by MongoDB _id.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Influencer MongoDB ObjectId (_id)',
          schema: {
            type: 'string',
            pattern: '^[a-fA-F0-9]{24}$',
            example: '507f1f77bcf86cd799439011'
          }
        }
      ],
      responses: {
        200: { description: 'Deleted' },
        400: { description: 'Invalid ObjectId' },
        404: { description: 'Influencer not found' }
      }
    }
  },

  '/api/influencers/username/{username}': {
    get: {
      tags: ['Influencers'],
      summary: 'Get by Username',
      security: [{ BearerAuth: [] }],
      description: 'Fetch an influencer by `user_name`.',
      parameters: [
        {
          name: 'username',
          in: 'path',
          required: true,
          description: 'Influencer username (`user_name`)',
          schema: {
            type: 'string',
            minLength: 1,
            example: 'aaravtravels'
          }
        }
      ],
      responses: {
        200: { description: 'Influencer details' },
        400: { description: 'Invalid username' },
        404: { description: 'Not found' }
      }
    },
    patch: {
      tags: ['Influencers'],
      summary: 'Update by Username',
      description: 'Update an influencer by `user_name` using any subset of influencerSchema fields.',
      parameters: [
        {
          name: 'username',
          in: 'path',
          required: true,
          description: 'Influencer username (`user_name`)',
          schema: {
            type: 'string',
            minLength: 1,
            example: 'aaravtravels'
          }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Influencer'
            }
          }
        }
      },
      responses: {
        200: { description: 'Updated' },
        400: { description: 'Invalid username or duplicate username' },
        404: { description: 'Influencer not found' }
      }
    },
    delete: {
      tags: ['Influencers'],
      summary: 'Delete by Username',
      description: 'Delete an influencer by `user_name`.',
      parameters: [
        {
          name: 'username',
          in: 'path',
          required: true,
          description: 'Influencer username (`user_name`)',
          schema: {
            type: 'string',
            minLength: 1,
            example: 'aaravtravels'
          }
        }
      ],
      responses: {
        200: { description: 'Deleted' },
        400: { description: 'Invalid username' },
        404: { description: 'Influencer not found' }
      }
    }
  },

  // ============ BRANDS (5 endpoints) ============
  '/api/brands': {
    get: {
      tags: ['Brands'],
      summary: 'List Brands',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } }
      ],
      responses: {
        200: { description: 'Brands list' }
      }
    }
  },

  '/api/brands/me': {
    get: {
      tags: ['Brands'],
      summary: 'Get My Brand Profile',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Brand profile' }
      }
    }
  },

  '/api/brands/nearby': {
    get: {
      tags: ['Brands'],
      summary: 'Nearby Brands',
      parameters: [
        { name: 'latitude', in: 'query', schema: { type: 'number' } },
        { name: 'longitude', in: 'query', schema: { type: 'number' } }
      ],
      responses: {
        200: { description: 'Nearby brands' }
      }
    }
  },

  '/api/brands/{id}': {
    get: {
      tags: ['Brands'],
      summary: 'Get Brand Details',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Brand details' },
        404: { description: 'Brand not found' }
      }
    }
  },

  // ============ NOTIFICATIONS (7 endpoints) ============
  '/api/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'Get All Notifications',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
      ],
      responses: {
        200: { description: 'Notifications' }
      }
    },
    delete: {
      tags: ['Notifications'],
      summary: 'Clear All Notifications',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Notifications cleared' }
      }
    }
  },

  '/api/notifications/unread': {
    get: {
      tags: ['Notifications'],
      summary: 'Get Unread Notifications',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Unread notifications' }
      }
    }
  },

  '/api/notifications/unread-count': {
    get: {
      tags: ['Notifications'],
      summary: 'Get Unread Count',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'Count',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      unreadCount: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  '/api/notifications/read-all': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark All as Read',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Marked as read' }
      }
    }
  },

  '/api/notifications/{id}/read': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark as Read',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Marked as read' }
      }
    }
  },

  '/api/notifications/{id}': {
    delete: {
      tags: ['Notifications'],
      summary: 'Delete Notification',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Deleted' }
      }
    }
  },

  // ============ MESSAGES (10 endpoints) ============
  '/api/messages/conversations': {
    get: {
      tags: ['Messages'],
      summary: 'List Conversations',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }
      ],
      responses: {
        200: { description: 'Conversations' }
      }
    },
    post: {
      tags: ['Messages'],
      summary: 'Create Conversation',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                participantId: { type: 'string' },
                message: { type: 'string' }
              },
              required: ['participantId']
            }
          }
        }
      },
      responses: {
        201: { description: 'Conversation created' }
      }
    }
  },

  '/api/messages/conversations/{id}': {
    get: {
      tags: ['Messages'],
      summary: 'Get Conversation',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Conversation details' }
      }
    },
    delete: {
      tags: ['Messages'],
      summary: 'Delete Conversation',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Deleted' }
      }
    }
  },

  '/api/messages': {
    get: {
      tags: ['Messages'],
      summary: 'Get Messages',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Messages' }
      }
    },
    post: {
      tags: ['Messages'],
      summary: 'Send Message',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                conversationId: { type: 'string' },
                message: { type: 'string' }
              },
              required: ['conversationId', 'message']
            }
          }
        }
      },
      responses: {
        201: { description: 'Message sent' }
      }
    }
  },

  '/api/messages/with-file': {
    post: {
      tags: ['Messages'],
      summary: 'Send Message with File',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                conversationId: { type: 'string' },
                message: { type: 'string' },
                file: { type: 'string', format: 'binary' }
              },
              required: ['conversationId', 'file']
            }
          }
        }
      },
      responses: {
        201: { description: 'Message sent' }
      }
    }
  },

  '/api/messages/{conversationId}': {
    get: {
      tags: ['Messages'],
      summary: 'Get Conversation Messages',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Messages' }
      }
    }
  },

  '/api/messages/{id}/read': {
    patch: {
      tags: ['Messages'],
      summary: 'Mark Message as Read',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Marked as read' }
      }
    }
  },

  '/api/messages/{id}': {
    delete: {
      tags: ['Messages'],
      summary: 'Delete Message',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Deleted' }
      }
    }
  },

  '/api/conversation/user': {
    get: {
      tags: ['Messages'],
      summary: 'List Conversations via Conversation Route',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Conversations' }
      }
    }
  },

  '/api/conversation/{id}': {
    get: {
      tags: ['Messages'],
      summary: 'Get Conversation via Conversation Route',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Conversation details' }
      }
    },
    delete: {
      tags: ['Messages'],
      summary: 'Delete Conversation via Conversation Route',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Deleted' }
      }
    }
  },

  // ============ PAYMENTS (22 endpoints) ============
  '/api/payment/plans': {
    get: {
      tags: ['Payments'],
      summary: 'Get Subscription Plans',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Plans available' }
      }
    }
  },

  '/api/payment/user-plan': {
    get: {
      tags: ['Payments'],
      summary: 'Get Current Plan',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Current plan' }
      }
    }
  },

  '/api/payment/create-order': {
    post: {
      tags: ['Payments'],
      summary: 'Create Payment Order',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                planId: { type: 'string' },
                amount: { type: 'number' }
              },
              required: ['planId', 'amount']
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Order created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    additionalProperties: true
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  '/api/payment/verify-payment': {
    post: {
      tags: ['Payments'],
      summary: 'Verify Payment',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                orderId: { type: 'string' },
                paymentId: { type: 'string' },
                signature: { type: 'string' }
              },
              required: ['orderId', 'paymentId', 'signature']
            }
          }
        }
      },
      responses: {
        200: { description: 'Payment verified' },
        400: { description: 'Invalid signature' }
      }
    }
  },

  '/api/payment/history': {
    get: {
      tags: ['Payments'],
      summary: 'Payment History',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Payment history' }
      }
    }
  },

  '/api/payment/credits': {
    get: {
      tags: ['Payments'],
      summary: 'Get Credits Balance',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'Credits info',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    additionalProperties: true
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  '/api/payment/webhook': {
    post: {
      tags: ['Payments'],
      summary: 'Razorpay Webhook',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      },
      responses: {
        200: { description: 'Webhook processed' }
      }
    }
  },

  '/api/payment/cancel-subscription': {
    post: {
      tags: ['Payments'],
      summary: 'Cancel Subscription',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Subscription cancelled' }
      }
    }
  },

  '/api/payment/pause-subscription': {
    post: {
      tags: ['Payments'],
      summary: 'Pause Subscription',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Subscription paused' }
      }
    }
  },

  '/api/payment/razorpay/plans': {
    get: {
      tags: ['Payments'],
      summary: 'Fetch All Razorpay Plans',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'count', in: 'query', required: false, schema: { type: 'integer' } },
        { name: 'skip', in: 'query', required: false, schema: { type: 'integer' } }
      ],
      responses: {
        200: { description: 'Razorpay plans fetched' }
      }
    },
    post: {
      tags: ['Payments'],
      summary: 'Create Razorpay Plan',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                period: { type: 'string', example: 'monthly' },
                interval: { type: 'integer', example: 1 },
                item: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    amount: { type: 'integer', description: 'Amount in paise' },
                    currency: { type: 'string', example: 'INR' },
                    description: { type: 'string' }
                  },
                  required: ['name', 'amount', 'currency']
                }
              },
              required: ['period', 'interval', 'item']
            }
          }
        }
      },
      responses: {
        200: { description: 'Razorpay plan created' }
      }
    }
  },

  '/api/payment/razorpay/plans/{planId}': {
    get: {
      tags: ['Payments'],
      summary: 'Fetch Razorpay Plan By ID',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'planId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Razorpay plan details fetched' }
      }
    }
  },

  '/api/payment/razorpay/subscriptions': {
    get: {
      tags: ['Payments'],
      summary: 'Fetch All Razorpay Subscriptions',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'count', in: 'query', required: false, schema: { type: 'integer' } },
        { name: 'skip', in: 'query', required: false, schema: { type: 'integer' } }
      ],
      responses: {
        200: { description: 'Razorpay subscriptions fetched' }
      }
    },
    post: {
      tags: ['Payments'],
      summary: 'Create Razorpay Subscription',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                plan_id: { type: 'string' },
                total_count: { type: 'integer' },
                quantity: { type: 'integer' },
                customer_notify: { type: 'boolean' },
                start_at: { type: 'integer', description: 'Unix timestamp' }
              },
              required: ['plan_id', 'total_count']
            }
          }
        }
      },
      responses: {
        200: { description: 'Razorpay subscription created' }
      }
    }
  },

  '/api/payment/razorpay/subscription-links': {
    post: {
      tags: ['Payments'],
      summary: 'Create Razorpay Subscription Link',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      },
      responses: {
        200: { description: 'Razorpay subscription link created' }
      }
    }
  },

  '/api/payment/razorpay/subscriptions/{subscriptionId}': {
    get: {
      tags: ['Payments'],
      summary: 'Fetch Razorpay Subscription By ID',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'subscriptionId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Razorpay subscription details fetched' }
      }
    },
    patch: {
      tags: ['Payments'],
      summary: 'Update Razorpay Subscription',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'subscriptionId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      },
      responses: {
        200: { description: 'Razorpay subscription updated' }
      }
    }
  },

  '/api/payment/razorpay/subscriptions/{subscriptionId}/cancel': {
    post: {
      tags: ['Payments'],
      summary: 'Cancel Razorpay Subscription',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'subscriptionId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'cancel_at_cycle_end', in: 'query', required: false, schema: { type: 'boolean' } }
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                cancel_at_cycle_end: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Razorpay subscription cancelled' }
      }
    }
  },

  '/api/payment/razorpay/subscriptions/{subscriptionId}/pending-update': {
    get: {
      tags: ['Payments'],
      summary: 'Fetch Razorpay Pending Update Details',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'subscriptionId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Razorpay pending update details fetched' }
      }
    }
  },

  '/api/payment/razorpay/subscriptions/{subscriptionId}/pending-update/cancel': {
    post: {
      tags: ['Payments'],
      summary: 'Cancel Razorpay Pending Update',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'subscriptionId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Razorpay pending update cancelled' }
      }
    }
  },

  '/api/payment/razorpay/subscriptions/{subscriptionId}/pause': {
    post: {
      tags: ['Payments'],
      summary: 'Pause Razorpay Subscription',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'subscriptionId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                pause_at: {
                  oneOf: [{ type: 'string', enum: ['now', 'cycle_end'] }, { type: 'integer' }]
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Razorpay subscription paused' }
      }
    }
  },

  '/api/payment/razorpay/subscriptions/{subscriptionId}/resume': {
    post: {
      tags: ['Payments'],
      summary: 'Resume Razorpay Subscription',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'subscriptionId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                resume_at: {
                  oneOf: [{ type: 'string', enum: ['now'] }, { type: 'integer' }]
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Razorpay subscription resumed' }
      }
    }
  },

  '/api/payment/razorpay/subscriptions/{subscriptionId}/invoices': {
    get: {
      tags: ['Payments'],
      summary: 'Fetch All Invoices For Razorpay Subscription',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'subscriptionId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'count', in: 'query', required: false, schema: { type: 'integer' } },
        { name: 'skip', in: 'query', required: false, schema: { type: 'integer' } }
      ],
      responses: {
        200: { description: 'Razorpay subscription invoices fetched' }
      }
    }
  },

  // ============ ANALYTICS (6 endpoints) ============
  '/api/analytics/dashboard': {
    get: {
      tags: ['Analytics'],
      summary: 'Dashboard Metrics',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Dashboard metrics' }
      }
    }
  },

  '/api/analytics/influencer-performance/{id}': {
    get: {
      tags: ['Analytics'],
      summary: 'Influencer Performance Metrics',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Performance metrics' }
      }
    }
  },

  '/api/analytics/campaign-performance/{campaignId}': {
    get: {
      tags: ['Analytics'],
      summary: 'Campaign Performance Metrics',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'campaignId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Campaign metrics' }
      }
    }
  },

  '/api/analytics/campaigns/{campaignId}': {
    get: {
      tags: ['Analytics'],
      summary: 'Campaign Analytics',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'campaignId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Analytics data' }
      }
    }
  },

  '/api/analytics/reports': {
    get: {
      tags: ['Analytics'],
      summary: 'Generate Reports',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Reports' }
      }
    }
  },

  '/api/analytics/earnings': {
    get: {
      tags: ['Analytics'],
      summary: 'Get Earnings',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Earnings data' }
      }
    }
  },

  // ============ ADMIN (16 endpoints) ============
  '/api/admin/login': {
    post: {
      tags: ['Admin'],
      summary: 'Admin Login',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', format: 'password' }
              },
              required: ['email', 'password']
            }
          }
        }
      },
      responses: {
        200: { description: 'Authenticated' },
        401: { description: 'Invalid credentials' }
      }
    }
  },

  '/api/admin/profile': {
    get: {
      tags: ['Admin'],
      summary: 'Admin Profile',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Profile' }
      }
    }
  },

  '/api/admin/change-password': {
    put: {
      tags: ['Admin'],
      summary: 'Change Admin Password',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                currentPassword: { type: 'string', format: 'password' },
                newPassword: { type: 'string', format: 'password' }
              },
              required: ['currentPassword', 'newPassword']
            }
          }
        }
      },
      responses: {
        200: { description: 'Password changed' }
      }
    }
  },

  '/api/admin/create': {
    post: {
      tags: ['Admin'],
      summary: 'Create Admin User',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', format: 'password' },
                name: { type: 'string' },
                role: { type: 'string' }
              },
              required: ['email', 'password', 'name']
            }
          }
        }
      },
      responses: {
        201: { description: 'Admin created' }
      }
    }
  },

  '/api/admin/list': {
    get: {
      tags: ['Admin'],
      summary: 'List Admins',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Admins list' }
      }
    }
  },

  '/api/admin/{id}/toggle-status': {
    put: {
      tags: ['Admin'],
      summary: 'Toggle Admin Status',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Status toggled' }
      }
    }
  },

  '/api/admin/approvals': {
    get: {
      tags: ['Admin'],
      summary: 'Get Pending Approvals',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Approvals list' }
      }
    }
  },

  '/api/admin/approvals/{status}': {
    get: {
      tags: ['Admin'],
      summary: 'Filter Approvals by Status',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'status', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Filtered approvals' }
      }
    }
  },

  '/api/admin/approvals/brand/{id}/approve': {
    post: {
      tags: ['Admin'],
      summary: 'Approve Brand',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                remarks: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Brand approved' }
      }
    }
  },

  '/api/admin/approvals/brand/{id}/reject': {
    post: {
      tags: ['Admin'],
      summary: 'Reject Brand',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reason: { type: 'string' }
              },
              required: ['reason']
            }
          }
        }
      },
      responses: {
        200: { description: 'Brand rejected' }
      }
    }
  },

  '/api/admin/approvals/influencer/{id}/approve': {
    post: {
      tags: ['Admin'],
      summary: 'Approve Influencer',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Influencer approved' }
      }
    }
  },

  '/api/admin/approvals/influencer/{id}/reject': {
    post: {
      tags: ['Admin'],
      summary: 'Reject Influencer',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reason: { type: 'string' }
              },
              required: ['reason']
            }
          }
        }
      },
      responses: {
        200: { description: 'Influencer rejected' }
      }
    }
  },

  '/api/admin/users': {
    get: {
      tags: ['Admin'],
      summary: 'List All Users',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'role', in: 'query', schema: { type: 'string' } },
        { name: 'verified', in: 'query', schema: { type: 'boolean' } }
      ],
      responses: {
        200: { description: 'Users list' }
      }
    }
  },

  '/api/admin/stats': {
    get: {
      tags: ['Admin'],
      summary: 'System Statistics',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'System stats' }
      }
    }
  },

  // ============ ACCOUNT & SUBSCRIPTIONS ============
  '/api/account/subscriptions/current': {
    get: {
      tags: ['Account'],
      summary: 'Get Current Subscription',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Current subscription' }
      }
    }
  },

  '/api/account/subscriptions/upgrade': {
    post: {
      tags: ['Account'],
      summary: 'Upgrade Subscription',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                planId: { type: 'string' }
              },
              required: ['planId']
            }
          }
        }
      },
      responses: {
        200: { description: 'Upgraded' }
      }
    }
  },

  '/api/account/subscriptions/cancel': {
    post: {
      tags: ['Account'],
      summary: 'Cancel Subscription',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Cancelled' }
      }
    }
  },

  '/api/account/payments/history': {
    get: {
      tags: ['Account'],
      summary: 'Payment History',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        200: { description: 'Payment history' }
      }
    }
  },

  '/api/upload/chat-image': {
    post: {
      tags: ['Upload'],
      summary: 'Upload Chat Image',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                image: { type: 'string', format: 'binary' },
                conversationId: { type: 'string' }
              },
              required: ['image']
            }
          }
        }
      },
      responses: {
        200: { description: 'Chat image uploaded' }
      }
    }
  },

  '/api/upload/chat-file': {
    post: {
      tags: ['Upload'],
      summary: 'Upload Chat File',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: { type: 'string', format: 'binary' },
                conversationId: { type: 'string' }
              },
              required: ['file']
            }
          }
        }
      },
      responses: {
        200: { description: 'Chat file uploaded' }
      }
    }
  },

  '/api/upload/chat-file/{key}': {
    delete: {
      tags: ['Upload'],
      summary: 'Delete Chat File',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Chat file deleted' }
      }
    }
  },

  '/api/ask': {
    post: {
      tags: ['AI'],
      summary: 'Ask AI for Creator Search',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                prompt: { type: 'string' }
              },
              required: ['prompt']
            }
          }
        }
      },
      responses: {
        200: { description: 'AI response' }
      }
    }
  },

  '/api/ask/details': {
    get: {
      tags: ['AI'],
      summary: 'Get AI Creator Details',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'username', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Creator details' }
      }
    }
  },

  '/api/ask/debug': {
    get: {
      tags: ['AI'],
      summary: 'Debug AI Data',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Debug response' }
      }
    }
  },

  '/api/ask/test-brightdata': {
    get: {
      tags: ['AI'],
      summary: 'Test BrightData Integration',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'BrightData test response' }
      }
    }
  },

  '/api/ask/test-snapshot': {
    get: {
      tags: ['AI'],
      summary: 'Test BrightData Snapshot',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Snapshot test response' }
      }
    }
  },

  '/api/ask/reel': {
    post: {
      tags: ['AI'],
      summary: 'Fetch Instagram Reel via AI Flow',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                url: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Reel data' }
      }
    }
  },

  '/api/meta/connect': {
    post: {
      tags: ['Meta'],
      summary: 'Connect Meta Account',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      },
      responses: {
        200: { description: 'Meta connection response' }
      }
    }
  },

  '/api/meta/oauth/url': {
    get: {
      tags: ['Meta'],
      summary: 'Get Meta OAuth URL',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'OAuth URL' }
      }
    }
  },

  '/api/meta/oauth/callback': {
    get: {
      tags: ['Meta'],
      summary: 'Handle Meta OAuth Callback',
      parameters: [
        { name: 'code', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Meta OAuth callback response' }
      }
    }
  },

  '/api/meta/status': {
    get: {
      tags: ['Meta'],
      summary: 'Get Meta Connection Status',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Meta status' }
      }
    }
  },

  '/api/meta/accounts': {
    get: {
      tags: ['Meta'],
      summary: 'Get Connected Meta Accounts',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Connected accounts' }
      }
    }
  },

  '/api/meta/connected-accounts': {
    get: {
      tags: ['Meta'],
      summary: 'Get Connected Meta Accounts Alias',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Connected accounts' }
      }
    }
  },

  '/api/meta/ad-accounts': {
    get: {
      tags: ['Meta'],
      summary: 'Get Meta Ad Accounts',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Ad accounts' }
      }
    }
  },

  '/api/meta/campaigns/{adAccountId}': {
    get: {
      tags: ['Meta'],
      summary: 'Get Meta Campaign Insights by Ad Account',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'adAccountId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Campaign insights' }
      }
    }
  },

  '/api/meta/ad-account/{adAccountId}': {
    get: {
      tags: ['Meta'],
      summary: 'Get Meta Ad Account Details',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'adAccountId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Ad account details' }
      }
    }
  },

  '/api/meta/page-insights': {
    get: {
      tags: ['Meta'],
      summary: 'Get Meta Page Insights',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Page insights' }
      }
    }
  },

  '/api/meta/dashboard': {
    get: {
      tags: ['Meta'],
      summary: 'Get Meta Dashboard',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Meta dashboard data' }
      }
    }
  },

  '/api/meta/facebook/insights': {
    get: {
      tags: ['Meta'],
      summary: 'Get Facebook Insights',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Facebook insights' }
      }
    }
  },

  '/api/meta/sync': {
    post: {
      tags: ['Meta'],
      summary: 'Sync Meta Metrics',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Sync result' }
      }
    }
  },

  '/api/meta/sync/{campaignId}': {
    post: {
      tags: ['Meta'],
      summary: 'Sync Meta Metrics for Campaign',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'campaignId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Sync result' }
      }
    }
  },

  '/api/meta/metrics/{campaignId}': {
    get: {
      tags: ['Meta'],
      summary: 'Get Meta Metrics by Campaign',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'campaignId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Campaign metrics' }
      }
    }
  },

  '/api/meta/insights/{campaignId}': {
    get: {
      tags: ['Meta'],
      summary: 'Get Meta Insights by Campaign',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'campaignId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Campaign insights' }
      }
    }
  },

  '/api/meta/sync-history': {
    get: {
      tags: ['Meta'],
      summary: 'Get Meta Sync History',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Sync history' }
      }
    }
  },

  '/api/meta/disconnect': {
    delete: {
      tags: ['Meta'],
      summary: 'Disconnect Meta Account',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Disconnected' }
      }
    },
    post: {
      tags: ['Meta'],
      summary: 'Disconnect Meta Account via POST',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Disconnected' }
      }
    }
  },

  '/api/brand-requests/submit': {
    post: {
      tags: ['Requests'],
      summary: 'Submit Brand Request',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      },
      responses: {
        200: { description: 'Brand request submitted' }
      }
    }
  },

  '/api/brand-requests/profile': {
    get: {
      tags: ['Requests'],
      summary: 'Get Brand Request Profile',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Brand profile' }
      }
    },
    put: {
      tags: ['Requests'],
      summary: 'Update Brand Request Profile',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      },
      responses: {
        200: { description: 'Brand profile updated' }
      }
    }
  },

  '/api/brand-requests/change-password': {
    put: {
      tags: ['Requests'],
      summary: 'Change Brand Request Password',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                currentPassword: { type: 'string' },
                newPassword: { type: 'string' }
              },
              required: ['currentPassword', 'newPassword']
            }
          }
        }
      },
      responses: {
        200: { description: 'Password changed' }
      }
    }
  },

  '/api/brand-requests/admin/requests': {
    get: {
      tags: ['Requests'],
      summary: 'List Brand Requests',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Brand requests' }
      }
    }
  },

  '/api/brand-requests/admin/requests/stats': {
    get: {
      tags: ['Requests'],
      summary: 'Brand Request Stats',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Brand request stats' }
      }
    }
  },

  '/api/brand-requests/admin/requests/{id}': {
    get: {
      tags: ['Requests'],
      summary: 'Get Brand Request',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Brand request details' }
      }
    }
  },

  '/api/brand-requests/admin/requests/{id}/approve': {
    put: {
      tags: ['Requests'],
      summary: 'Approve Brand Request',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Brand request approved' }
      }
    }
  },

  '/api/brand-requests/admin/requests/{id}/reject': {
    put: {
      tags: ['Requests'],
      summary: 'Reject Brand Request',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Brand request rejected' }
      }
    }
  },

  '/api/influencer-requests/submit': {
    post: {
      tags: ['Requests'],
      summary: 'Submit Influencer Request',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      },
      responses: {
        200: { description: 'Influencer request submitted' }
      }
    }
  },

  '/api/influencer-requests/profile': {
    get: {
      tags: ['Requests'],
      summary: 'Get Influencer Request Profile',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Influencer profile' }
      }
    },
    put: {
      tags: ['Requests'],
      summary: 'Update Influencer Request Profile',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      },
      responses: {
        200: { description: 'Influencer profile updated' }
      }
    }
  },

  '/api/influencer-requests/admin/requests': {
    get: {
      tags: ['Requests'],
      summary: 'List Influencer Requests',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Influencer requests' }
      }
    }
  },

  '/api/influencer-requests/admin/requests/stats': {
    get: {
      tags: ['Requests'],
      summary: 'Influencer Request Stats',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Influencer request stats' }
      }
    }
  },

  '/api/influencer-requests/admin/requests/{id}': {
    get: {
      tags: ['Requests'],
      summary: 'Get Influencer Request',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Influencer request details' }
      }
    }
  },

  '/api/influencer-requests/admin/requests/{id}/approve': {
    put: {
      tags: ['Requests'],
      summary: 'Approve Influencer Request',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Influencer request approved' }
      }
    }
  },

  '/api/influencer-requests/admin/requests/{id}/reject': {
    put: {
      tags: ['Requests'],
      summary: 'Reject Influencer Request',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Influencer request rejected' }
      }
    }
  },

  '/api/landing': {
    get: {
      tags: ['Landing'],
      summary: 'Get Landing Page Content',
      responses: {
        200: {
          description: 'Landing page data',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      nav: { type: 'array', items: { type: 'string' } },
                      hero: { type: 'object', additionalProperties: true },
                      stats: { type: 'array', items: { type: 'object', additionalProperties: true } },
                      story: { type: 'object', additionalProperties: true },
                      features: { type: 'array', items: { type: 'object', additionalProperties: true } },
                      pricingTabs: { type: 'array', items: { type: 'string' } },
                      plans: { type: 'array', items: { type: 'object', additionalProperties: true } },
                      faq: { type: 'array', items: { type: 'object', additionalProperties: true } },
                      comparison: { type: 'array', items: { type: 'object', additionalProperties: true } },
                      cta: { type: 'object', additionalProperties: true }
                    },
                    additionalProperties: true
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  '/api/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Alias for user registration',
      responses: {
        201: { description: 'User registered successfully' },
        400: { description: 'Validation error' }
      }
    }
  },

  '/api/auth/verify-reset-code': {
    post: {
      tags: ['Authentication'],
      summary: 'Alias for password reset code verification',
      responses: {
        200: { description: 'Reset code verified' },
        400: { description: 'Invalid verification code' }
      }
    }
  },

  '/api/auth/facebook': {
    post: {
      tags: ['Authentication'],
      summary: 'Facebook login compatibility endpoint',
      responses: {
        501: { description: 'Facebook OAuth not configured' }
      }
    }
  },

  '/api/brand-requests/send-otp': {
    post: {
      tags: ['Brand Requests'],
      summary: 'Resend OTP for brand account verification',
      responses: {
        200: { description: 'OTP resent successfully' }
      }
    }
  },

  '/api/brand-requests/verify-otp': {
    post: {
      tags: ['Brand Requests'],
      summary: 'Verify brand account OTP',
      responses: {
        200: { description: 'OTP verified successfully' }
      }
    }
  },

  '/api/brands/trending': {
    get: {
      tags: ['Trending'],
      summary: 'Trending brands compatibility alias',
      responses: {
        200: { description: 'Trending brands returned' }
      }
    }
  },

  '/api/brands/{id}/campaigns': {
    get: {
      tags: ['Brands'],
      summary: 'Get campaigns for a brand',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Brand campaigns returned' }
      }
    }
  },

  '/api/brands/{id}/stats': {
    get: {
      tags: ['Brands'],
      summary: 'Get brand campaign stats',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Brand stats returned' }
      }
    }
  },

  '/api/campaigns/trending': {
    get: {
      tags: ['Trending'],
      summary: 'Trending campaigns compatibility alias',
      responses: {
        200: { description: 'Trending campaigns returned' }
      }
    }
  },

  '/api/influencers/trending': {
    get: {
      tags: ['Trending'],
      summary: 'Trending influencers compatibility alias',
      responses: {
        200: { description: 'Trending influencers returned' }
      }
    }
  },

  '/api/analytics/campaigns': {
    get: {
      tags: ['Analytics'],
      summary: 'List campaign analytics',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Campaign analytics returned' }
      }
    }
  },

  '/api/analytics/campaigns/{campaignId}/report': {
    get: {
      tags: ['Analytics'],
      summary: 'Get one campaign analytics report',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'campaignId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Campaign report returned' }
      }
    }
  },

  '/api/analytics/influencers/{id}': {
    get: {
      tags: ['Analytics'],
      summary: 'Influencer analytics compatibility alias',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Influencer analytics returned' }
      }
    }
  },

  '/api/analytics/profile': {
    get: {
      tags: ['Analytics'],
      summary: 'Current user profile analytics',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Profile analytics returned' }
      }
    }
  },

  '/api/favorites/check/{type}/{itemId}': {
    get: {
      tags: ['Favorites'],
      summary: 'Check if an item is favorited',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['campaign', 'influencer', 'brand'] } },
        { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Favorite status returned' }
      }
    }
  },

  '/api/favorites/clear-all': {
    delete: {
      tags: ['Favorites'],
      summary: 'Clear all favorites for current user',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Favorites cleared' }
      }
    }
  },

  '/api/favorites/{type}/{itemId}': {
    delete: {
      tags: ['Favorites'],
      summary: 'Remove favorite by type and item id',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['campaign', 'influencer', 'brand'] } },
        { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Favorite removed' }
      }
    }
  },

  '/api/notifications/preferences': {
    get: {
      tags: ['Notifications'],
      summary: 'Get notification preferences',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Notification preferences returned' }
      }
    },
    patch: {
      tags: ['Notifications'],
      summary: 'Update notification preferences',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Notification preferences updated' }
      }
    }
  },

  '/api/payments/current-plan': {
    get: {
      tags: ['Payments'],
      summary: 'Alias for current user plan',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Current plan returned' }
      }
    }
  },

  '/api/payments/plans': {
    get: {
      tags: ['Payments'],
      summary: 'Alias for plan catalog',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Plans returned' }
      }
    }
  },

  '/api/payments/history': {
    get: {
      tags: ['Payments'],
      summary: 'Alias for payment history',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Payment history returned' }
      }
    }
  },

  '/api/payments/credits': {
    get: {
      tags: ['Payments'],
      summary: 'Alias for current user credits',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Credit balance returned' }
      }
    }
  },

  '/api/payments/order/{planId}': {
    post: {
      tags: ['Payments'],
      summary: 'Alias for payment order creation',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'planId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Order created' }
      }
    }
  },

  '/api/payments/verify': {
    post: {
      tags: ['Payments'],
      summary: 'Alias for payment verification',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Payment verified' }
      }
    }
  },

  '/api/payments/cancel': {
    post: {
      tags: ['Payments'],
      summary: 'Alias for subscription cancellation',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'Subscription cancelled' }
      }
    }
  }
};

export const correctComponents = {
  schemas: correctSchemas
};
