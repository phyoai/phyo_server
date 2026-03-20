const List = require('../models/List');

// Get all lists for user
exports.getLists = async (req, res) => {
  try {
    const userId = req.user.id;
    const lists = await List.find({ userId })
      .sort({ createdAt: -1 })
      .select('_id name description influencers isPublic createdAt updatedAt');

    res.status(200).json({
      success: true,
      data: lists
    });
  } catch (err) {
    console.error('Error fetching lists:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching lists'
    });
  }
};

// Get single list with details
exports.getList = async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.user.id;

    const list = await List.findOne({ _id: listId, userId })
      .populate({
        path: 'influencers',
        select: 'name username avatar followers bio stats'
      });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    res.status(200).json({
      success: true,
      data: list
    });
  } catch (err) {
    console.error('Error fetching list:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching list'
    });
  }
};

// Create new list
exports.createList = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'List name is required'
      });
    }

    const newList = new List({
      userId,
      name: name.trim(),
      description: description || '',
      isPublic: isPublic || false,
      influencers: []
    });

    await newList.save();

    res.status(201).json({
      success: true,
      message: 'List created successfully',
      data: newList
    });
  } catch (err) {
    console.error('Error creating list:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating list'
    });
  }
};

// Update list
exports.updateList = async (req, res) => {
  try {
    const { listId } = req.params;
    const { name, description, isPublic } = req.body;
    const userId = req.user.id;

    const list = await List.findOne({ _id: listId, userId });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    if (name) list.name = name.trim();
    if (description !== undefined) list.description = description;
    if (isPublic !== undefined) list.isPublic = isPublic;
    list.updatedAt = Date.now();

    await list.save();

    res.status(200).json({
      success: true,
      message: 'List updated successfully',
      data: list
    });
  } catch (err) {
    console.error('Error updating list:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating list'
    });
  }
};

// Delete list
exports.deleteList = async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.user.id;

    const list = await List.findOneAndDelete({ _id: listId, userId });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'List deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting list:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting list'
    });
  }
};

// Add influencer to list
exports.addInfluencerToList = async (req, res) => {
  try {
    const { listId } = req.params;
    const { influencerId } = req.body;
    const userId = req.user.id;

    if (!influencerId) {
      return res.status(400).json({
        success: false,
        message: 'Influencer ID is required'
      });
    }

    const list = await List.findOne({ _id: listId, userId });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check if influencer already in list
    if (list.influencers.includes(influencerId)) {
      return res.status(400).json({
        success: false,
        message: 'Influencer already in list'
      });
    }

    list.influencers.push(influencerId);
    list.updatedAt = Date.now();
    await list.save();

    res.status(200).json({
      success: true,
      message: 'Influencer added to list',
      data: list
    });
  } catch (err) {
    console.error('Error adding influencer to list:', err);
    res.status(500).json({
      success: false,
      message: 'Error adding influencer to list'
    });
  }
};

// Remove influencer from list
exports.removeInfluencerFromList = async (req, res) => {
  try {
    const { listId } = req.params;
    const { influencerId } = req.body;
    const userId = req.user.id;

    if (!influencerId) {
      return res.status(400).json({
        success: false,
        message: 'Influencer ID is required'
      });
    }

    const list = await List.findOne({ _id: listId, userId });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    list.influencers = list.influencers.filter(id => id.toString() !== influencerId);
    list.updatedAt = Date.now();
    await list.save();

    res.status(200).json({
      success: true,
      message: 'Influencer removed from list',
      data: list
    });
  } catch (err) {
    console.error('Error removing influencer from list:', err);
    res.status(500).json({
      success: false,
      message: 'Error removing influencer from list'
    });
  }
};

// Bulk add influencers to list
exports.bulkAddInfluencers = async (req, res) => {
  try {
    const { listId } = req.params;
    const { influencerIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(influencerIds) || influencerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Influencer IDs array is required'
      });
    }

    const list = await List.findOne({ _id: listId, userId });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Add only new influencers
    const newInfluencers = influencerIds.filter(
      id => !list.influencers.some(existing => existing.toString() === id)
    );

    list.influencers.push(...newInfluencers);
    list.updatedAt = Date.now();
    await list.save();

    res.status(200).json({
      success: true,
      message: `Added ${newInfluencers.length} influencers to list`,
      data: list
    });
  } catch (err) {
    console.error('Error bulk adding influencers:', err);
    res.status(500).json({
      success: false,
      message: 'Error adding influencers to list'
    });
  }
};

// Bulk remove influencers from list
exports.bulkRemoveInfluencers = async (req, res) => {
  try {
    const { listId } = req.params;
    const { influencerIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(influencerIds) || influencerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Influencer IDs array is required'
      });
    }

    const list = await List.findOne({ _id: listId, userId });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    list.influencers = list.influencers.filter(
      id => !influencerIds.includes(id.toString())
    );
    list.updatedAt = Date.now();
    await list.save();

    res.status(200).json({
      success: true,
      message: `Removed ${influencerIds.length} influencers from list`,
      data: list
    });
  } catch (err) {
    console.error('Error bulk removing influencers:', err);
    res.status(500).json({
      success: false,
      message: 'Error removing influencers from list'
    });
  }
};
