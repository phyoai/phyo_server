import express, { Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { uploadBrandFiles, extractFileUrls } from '../middleware/fileUpload';
import { brand } from '../models/auth';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Upload brand files (logo, images, documents)
router.post('/upload', authenticateToken, uploadBrandFiles, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    if (!files || Object.keys(files).length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    // Extract file URLs
    const userEmail = req.user.email || 'anonymous';
    const fileUrls = await extractFileUrls(files, userEmail);

    // Update brand profile with file URLs
    const updateData: any = {};
    
    if (fileUrls.company_logo) {
      updateData.company_logo = fileUrls.company_logo;
    }
    
    if (fileUrls.brand_images) {
      // Append to existing brand images
      const brandAccount = await brand.findById(req.user.id);
      if (brandAccount) {
        const existingImages = brandAccount.brand_images || [];
        updateData.brand_images = [...existingImages, ...fileUrls.brand_images];
      } else {
        updateData.brand_images = fileUrls.brand_images;
      }
    }
    
    if (fileUrls.business_registration || fileUrls.authorization_letter) {
      updateData.verification_documents = updateData.verification_documents || {};
      
      if (fileUrls.business_registration) {
        updateData['verification_documents.business_registration'] = fileUrls.business_registration;
      }
      
      if (fileUrls.authorization_letter) {
        updateData['verification_documents.authorization_letter'] = fileUrls.authorization_letter;
      }
    }

    // Update the brand profile
    const updatedBrand = await brand.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');

    res.status(200).json({
      message: 'Files uploaded successfully',
      files: fileUrls,
      brand: updatedBrand
    });

  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      message: error.message || 'File upload failed' 
    });
  }
});

// Upload company logo only
router.post('/upload/logo', authenticateToken, uploadBrandFiles, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    if (!files?.company_logo || files.company_logo.length === 0) {
      res.status(400).json({ message: 'No logo file uploaded' });
      return;
    }

    const userEmail = req.user.email || 'anonymous';
    const fileUrls = await extractFileUrls(files, userEmail);

    const updatedBrand = await brand.findByIdAndUpdate(
      req.user.id,
      { $set: { company_logo: fileUrls.company_logo } },
      { new: true }
    ).select('-password');

    res.status(200).json({
      message: 'Logo uploaded successfully',
      logo_url: fileUrls.company_logo,
      brand: updatedBrand
    });

  } catch (error: any) {
    console.error('Logo upload error:', error);
    res.status(500).json({ 
      message: error.message || 'Logo upload failed' 
    });
  }
});

// Upload brand images only
router.post('/upload/images', authenticateToken, uploadBrandFiles, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    if (!files?.brand_images || files.brand_images.length === 0) {
      res.status(400).json({ message: 'No images uploaded' });
      return;
    }

    const userEmail = req.user.email || 'anonymous';
    const fileUrls = await extractFileUrls(files, userEmail);

    // Append to existing images
    const brandAccount = await brand.findById(req.user.id);
    const existingImages = brandAccount?.brand_images || [];
    const allImages = [...existingImages, ...fileUrls.brand_images];

    const updatedBrand = await brand.findByIdAndUpdate(
      req.user.id,
      { $set: { brand_images: allImages } },
      { new: true }
    ).select('-password');

    res.status(200).json({
      message: 'Images uploaded successfully',
      image_urls: fileUrls.brand_images,
      brand: updatedBrand
    });

  } catch (error: any) {
    console.error('Images upload error:', error);
    res.status(500).json({ 
      message: error.message || 'Images upload failed' 
    });
  }
});

// Upload verification documents
router.post('/upload/documents', authenticateToken, uploadBrandFiles, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    if (!files || (!files.business_registration && !files.authorization_letter)) {
      res.status(400).json({ message: 'No documents uploaded' });
      return;
    }

    const userEmail = req.user.email || 'anonymous';
    const fileUrls = await extractFileUrls(files, userEmail);

    const updateData: any = {};
    
    if (fileUrls.business_registration) {
      updateData['verification_documents.business_registration'] = fileUrls.business_registration;
    }
    
    if (fileUrls.authorization_letter) {
      updateData['verification_documents.authorization_letter'] = fileUrls.authorization_letter;
    }

    const updatedBrand = await brand.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.status(200).json({
      message: 'Documents uploaded successfully',
      documents: fileUrls,
      brand: updatedBrand
    });

  } catch (error: any) {
    console.error('Documents upload error:', error);
    res.status(500).json({ 
      message: error.message || 'Documents upload failed' 
    });
  }
});

// Delete a brand image
router.delete('/images/:index', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const index = parseInt(req.params.index);
    
    const brandAccount = await brand.findById(req.user.id);
    
    if (!brandAccount || !brandAccount.brand_images || brandAccount.brand_images.length === 0) {
      res.status(404).json({ message: 'No images found' });
      return;
    }

    if (index < 0 || index >= brandAccount.brand_images.length) {
      res.status(400).json({ message: 'Invalid image index' });
      return;
    }

    // Remove the image at the specified index
    brandAccount.brand_images.splice(index, 1);
    await brandAccount.save();

    res.status(200).json({
      message: 'Image deleted successfully',
      brand_images: brandAccount.brand_images
    });

  } catch (error: any) {
    console.error('Delete image error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to delete image' 
    });
  }
});

export default router;
