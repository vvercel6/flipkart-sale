// pages/api/products/reorder.js
import connectToDatabase from '../../../utils/mongodb';
import Product from '../../../models/Product';
import { requireAdmin } from '../../../utils/auth';

async function handler(req, res) {
  // ✅ Await database connection
  await connectToDatabase();

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const { orderedIds } = req.body;

    // Validation
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderedIds array is required',
      });
    }

    // Validate all IDs exist
    const existingProducts = await Product.countDocuments({
      _id: { $in: orderedIds }
    });

    if (existingProducts !== orderedIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some product IDs are invalid',
      });
    }

    // Update sortOrder for each product
    const updatePromises = orderedIds.map((id, index) =>
      Product.findByIdAndUpdate(
        id,
        { sortOrder: index },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    return res.status(200).json({
      success: true,
      message: 'Product order updated successfully',
    });
  } catch (error) {
    console.error('Reorder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// ✅ Wrap with admin authentication
export default requireAdmin(handler);