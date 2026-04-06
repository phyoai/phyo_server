import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import Favorite from '../models/favorite';

// GET /favorites - get all favorites for user
export const getFavorites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      Favorite.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Favorite.countDocuments({ userId })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: favorites,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// POST /favorites - add favorite
export const addFavorite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { type, itemId } = req.body;

    if (!type || !itemId) {
      res.status(400).json({ success: false, message: 'type and itemId are required' });
      return;
    }

    if (!['campaign', 'influencer', 'brand'].includes(type)) {
      res.status(400).json({ success: false, message: 'type must be campaign, influencer, or brand' });
      return;
    }

    // Upsert to avoid duplicates
    const favorite = await Favorite.findOneAndUpdate(
      { userId, type, itemId },
      { userId, type, itemId },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      data: favorite,
      message: 'Added to favorites'
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// DELETE /favorites/:id - remove favorite by its own ID
export const removeFavorite = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const favorite = await Favorite.findOneAndDelete({ _id: id, userId });

    if (!favorite) {
      res.status(404).json({ success: false, message: 'Favorite not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Removed from favorites'
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// DELETE /favorites/:type/:itemId - remove favorite by item type and item ID
export const removeFavoriteByTypeAndItem = async (
  req: AuthenticatedRequest<{ type: string; itemId: string }>,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { type, itemId } = req.params;
    const favorite = await Favorite.findOneAndDelete({ userId, type, itemId });

    if (!favorite) {
      res.status(404).json({ success: false, message: 'Favorite not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Removed from favorites'
    });
  } catch (error) {
    console.error('Remove favorite by type/item error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /favorites/check/:type/:itemId - check if an item is favorited
export const checkFavorite = async (
  req: AuthenticatedRequest<{ type: string; itemId: string }>,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { type, itemId } = req.params;
    const favorite = await Favorite.findOne({ userId, type, itemId }).lean();

    res.json({
      success: true,
      data: {
        isFavorite: Boolean(favorite),
        favorite
      }
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// DELETE /favorites/clear-all - remove all favorites for current user
export const clearAllFavorites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const result = await Favorite.deleteMany({ userId });

    res.json({
      success: true,
      data: { deletedCount: result.deletedCount },
      message: 'All favorites cleared'
    });
  } catch (error) {
    console.error('Clear all favorites error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /favorites/campaigns - get favorited campaigns
export const getFavoriteCampaigns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const favorites = await Favorite.find({ userId, type: 'campaign' }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Get favorite campaigns error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /favorites/influencers - get favorited influencers
export const getFavoriteInfluencers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const favorites = await Favorite.find({ userId, type: 'influencer' }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Get favorite influencers error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /favorites/brands - get favorited brands
export const getFavoriteBrands = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const favorites = await Favorite.find({ userId, type: 'brand' }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Get favorite brands error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// POST /favorites/saved-influencers/:id - toggle saved influencer
export const toggleSavedInfluencer = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const existing = await Favorite.findOne({ userId, type: 'influencer', itemId: id });

    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      res.json({
        success: true,
        data: { saved: false },
        message: 'Influencer removed from saved list'
      });
    } else {
      const favorite = await Favorite.create({ userId, type: 'influencer', itemId: id });
      res.status(201).json({
        success: true,
        data: { saved: true, favorite },
        message: 'Influencer saved successfully'
      });
    }
  } catch (error) {
    console.error('Toggle saved influencer error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// DELETE /favorites/saved-influencers/:id - remove saved influencer
export const removeSavedInfluencer = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const result = await Favorite.findOneAndDelete({ userId, type: 'influencer', itemId: id });

    if (!result) {
      res.status(404).json({ success: false, message: 'Saved influencer not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Influencer removed from saved list'
    });
  } catch (error) {
    console.error('Remove saved influencer error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};
