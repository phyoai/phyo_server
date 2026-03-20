const PaymentMethod = require('../models/PaymentMethod');

// Get all payment methods for user
exports.getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;

    const methods = await PaymentMethod.find({ userId, isActive: true })
      .sort({ isDefault: -1, createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      data: methods
    });
  } catch (err) {
    console.error('Error fetching payment methods:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment methods'
    });
  }
};

// Get single payment method
exports.getPaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const userId = req.user.id;

    const method = await PaymentMethod.findOne({ _id: methodId, userId });

    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    res.status(200).json({
      success: true,
      data: method
    });
  } catch (err) {
    console.error('Error fetching payment method:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment method'
    });
  }
};

// Create new payment method
exports.createPaymentMethod = async (req, res) => {
  try {
    const { type, lastFourDigits, expiryDate, cardHolderName, upiId, bankName } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!type || !lastFourDigits) {
      return res.status(400).json({
        success: false,
        message: 'Payment type and last four digits are required'
      });
    }

    // Check if this is the first payment method (make it default)
    const existingMethods = await PaymentMethod.countDocuments({ userId });
    const isDefault = existingMethods === 0;

    const newMethod = new PaymentMethod({
      userId,
      type,
      lastFourDigits,
      expiryDate: expiryDate || null,
      cardHolderName: cardHolderName || '',
      upiId: upiId || null,
      bankName: bankName || null,
      isDefault
    });

    await newMethod.save();

    res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      data: newMethod
    });
  } catch (err) {
    console.error('Error creating payment method:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating payment method'
    });
  }
};

// Update payment method
exports.updatePaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const { cardHolderName, expiryDate } = req.body;
    const userId = req.user.id;

    const method = await PaymentMethod.findOne({ _id: methodId, userId });

    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    if (cardHolderName) method.cardHolderName = cardHolderName;
    if (expiryDate) method.expiryDate = expiryDate;
    method.updatedAt = Date.now();

    await method.save();

    res.status(200).json({
      success: true,
      message: 'Payment method updated successfully',
      data: method
    });
  } catch (err) {
    console.error('Error updating payment method:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating payment method'
    });
  }
};

// Set payment method as default
exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const userId = req.user.id;

    // Get the method to be set as default
    const method = await PaymentMethod.findOne({ _id: methodId, userId });

    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Remove default from all other methods
    await PaymentMethod.updateMany(
      { userId, isDefault: true },
      { isDefault: false }
    );

    // Set this method as default
    method.isDefault = true;
    method.updatedAt = Date.now();
    await method.save();

    res.status(200).json({
      success: true,
      message: 'Default payment method updated',
      data: method
    });
  } catch (err) {
    console.error('Error setting default payment method:', err);
    res.status(500).json({
      success: false,
      message: 'Error setting default payment method'
    });
  }
};

// Delete payment method
exports.deletePaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const userId = req.user.id;

    const method = await PaymentMethod.findOne({ _id: methodId, userId });

    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // If deleting default method, set another as default
    if (method.isDefault) {
      const nextDefault = await PaymentMethod.findOne({
        userId,
        _id: { $ne: methodId }
      });

      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    // Soft delete by marking as inactive
    method.isActive = false;
    method.updatedAt = Date.now();
    await method.save();

    res.status(200).json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting payment method:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment method'
    });
  }
};
