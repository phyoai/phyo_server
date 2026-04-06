import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { payment, subscription, subscriptionPlan, PREDEFINED_PLANS } from '../models/subscription';
import { user as User } from '../models/auth';
import UserList from '../models/userList';

// GET /account/transactions
export const getTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      payment.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      payment.countDocuments({ userId })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: transactions,
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
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /account/payments/history
export const getPaymentHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      payment.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      payment.countDocuments({ userId })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: payments,
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
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /account/payments/methods
export const getPaymentMethods = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const userDoc = await User.findById(userId).select('payment_method').lean();
    const paymentMethod = (userDoc as any)?.payment_method || {};

    const methods: any[] = [];

    if (paymentMethod.card_details) {
      methods.push({
        id: 'card',
        type: 'card',
        details: paymentMethod.card_details,
        isDefault: paymentMethod.default_payment === 'card'
      });
    }

    if (paymentMethod.bank_account) {
      methods.push({
        id: 'bank',
        type: 'bank',
        details: paymentMethod.bank_account,
        isDefault: paymentMethod.default_payment === 'bank'
      });
    }

    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// POST /account/payments/methods
export const addPaymentMethod = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { type, details } = req.body;

    if (!type || !details) {
      res.status(400).json({ success: false, message: 'type and details are required' });
      return;
    }

    const updateField = type === 'card' ? 'payment_method.card_details' : 'payment_method.bank_account';

    await User.findByIdAndUpdate(userId, {
      $set: { [updateField]: details }
    });

    res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      data: { type, details }
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// PUT /account/payments/methods/:id/default
export const setDefaultPaymentMethod = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params; // 'card' or 'bank'

    if (!['card', 'bank'].includes(id)) {
      res.status(400).json({ success: false, message: 'id must be card or bank' });
      return;
    }

    await User.findByIdAndUpdate(userId, {
      $set: { 'payment_method.default_payment': id }
    });

    res.json({
      success: true,
      message: 'Default payment method updated successfully'
    });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// DELETE /account/payments/methods/:id
export const deletePaymentMethod = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params; // 'card' or 'bank'

    const unsetField = id === 'card' ? 'payment_method.card_details' : 'payment_method.bank_account';

    await User.findByIdAndUpdate(userId, {
      $unset: { [unsetField]: '' }
    });

    res.json({
      success: true,
      message: 'Payment method removed successfully'
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /account/subscriptions/current
export const getCurrentSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const userDoc = await User.findById(userId).lean();
    if (!userDoc) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    let currentSubscription = null;
    if ((userDoc as any).subscriptionId) {
      currentSubscription = await subscription.findById((userDoc as any).subscriptionId).lean();
    }

    if (!currentSubscription) {
      // Return a default/free subscription object
      currentSubscription = {
        userId,
        planId: 'bronze-monthly',
        status: 'ACTIVE',
        plan: PREDEFINED_PLANS.find(p => p.name === 'BRONZE'),
        creditsRemaining: (userDoc as any).creditsRemaining || 0,
        creditsUsedThisMonth: 0,
        startDate: (userDoc as any).createdAt || new Date(),
        autoRenew: false
      };
    }

    res.json({
      success: true,
      data: {
        subscription: currentSubscription,
        currentPlan: (userDoc as any).currentPlan || 'BRONZE',
        subscriptionStatus: (userDoc as any).subscriptionStatus || 'ACTIVE',
        creditsRemaining: (userDoc as any).creditsRemaining || 0
      }
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /account/subscriptions/timeline
export const getSubscriptionTimeline = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // For now return single subscription history from payments
    const payments = await payment.find({ userId })
      .sort({ createdAt: 1 })
      .lean();

    const timeline = payments.map((p: any) => ({
      date: p.createdAt,
      event: p.status === 'COMPLETED' ? 'Payment completed' : `Payment ${p.status.toLowerCase()}`,
      amount: p.amount,
      currency: p.currency,
      description: p.description,
      planId: p.metadata?.planId
    }));

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    console.error('Get subscription timeline error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /account/subscriptions/plans
export const getSubscriptionPlans = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const plans = await subscriptionPlan.find({ isActive: true }).lean();
    const activePlans = plans.length > 0 ? plans : PREDEFINED_PLANS;

    res.json({
      success: true,
      data: activePlans
    });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// POST /account/subscriptions/upgrade
export const upgradeSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { planId } = req.body;

    if (!planId) {
      res.status(400).json({ success: false, message: 'planId is required' });
      return;
    }

    const plan = PREDEFINED_PLANS.find(p => p.id === planId);
    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found' });
      return;
    }

    res.json({
      success: true,
      message: 'To upgrade, please complete payment through the payment endpoint',
      data: {
        plan,
        paymentRequired: plan.price > 0
      }
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// POST /account/subscriptions/downgrade
export const downgradeSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { planId } = req.body;

    if (!planId) {
      res.status(400).json({ success: false, message: 'planId is required' });
      return;
    }

    res.json({
      success: true,
      message: 'Downgrade request submitted. Changes will take effect at the end of your billing cycle.',
      data: { targetPlanId: planId }
    });
  } catch (error) {
    console.error('Downgrade subscription error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// POST /account/subscriptions/cancel
export const cancelSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const userDoc = await User.findById(userId);
    if (!userDoc) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if ((userDoc as any).subscriptionId) {
      await subscription.findByIdAndUpdate((userDoc as any).subscriptionId, {
        status: 'CANCELLED',
        autoRenew: false
      });
    }

    await User.findByIdAndUpdate(userId, { subscriptionStatus: 'CANCELLED' });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /account/lists
export const getLists = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const lists = await UserList.find({ userId }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      data: lists
    });
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// POST /account/lists
export const createList = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'name is required' });
      return;
    }

    const list = await UserList.create({
      userId,
      name,
      description,
      items: []
    });

    res.status(201).json({
      success: true,
      data: list,
      message: 'List created successfully'
    });
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /account/lists/:id/items
export const getListItems = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const list = await UserList.findOne({ _id: id, userId }).lean();
    if (!list) {
      res.status(404).json({ success: false, message: 'List not found' });
      return;
    }

    res.json({
      success: true,
      data: list.items
    });
  } catch (error) {
    console.error('Get list items error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// POST /account/lists/:id/items
export const addListItem = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { itemId, itemType, notes } = req.body;

    if (!itemId || !itemType) {
      res.status(400).json({ success: false, message: 'itemId and itemType are required' });
      return;
    }

    const list = await UserList.findOneAndUpdate(
      { _id: id, userId },
      {
        $push: {
          items: {
            itemId,
            itemType,
            notes,
            addedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!list) {
      res.status(404).json({ success: false, message: 'List not found' });
      return;
    }

    res.status(201).json({
      success: true,
      data: list,
      message: 'Item added to list'
    });
  } catch (error) {
    console.error('Add list item error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// DELETE /account/lists/:id/items/:itemId
export const removeListItem = async (req: AuthenticatedRequest<{ id: string; itemId: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id, itemId } = req.params;

    const list = await UserList.findOneAndUpdate(
      { _id: id, userId },
      {
        $pull: {
          items: { _id: itemId }
        }
      },
      { new: true }
    );

    if (!list) {
      res.status(404).json({ success: false, message: 'List not found' });
      return;
    }

    res.json({
      success: true,
      data: list,
      message: 'Item removed from list'
    });
  } catch (error) {
    console.error('Remove list item error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};
