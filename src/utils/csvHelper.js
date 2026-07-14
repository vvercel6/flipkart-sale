// utils/csvHelper.js
import Papa from 'papaparse';

/**
 * Parse CSV file with comprehensive error handling
 * @param {File} file - CSV file to parse
 * @param {Object} options - Papa parse options
 * @returns {Promise<Array>} Parsed CSV data
 */
export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    // Check file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      return reject(new Error('Invalid file type. Please upload a CSV file.'));
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return reject(new Error('File size exceeds 10MB limit'));
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Clean header but preserve original structure
        return header.trim().toLowerCase().replace(/\s+/g, '_');
      },
      transform: (value, field) => {
        // Preserve multiline content, just trim whitespace
        if (!value) return '';
        return value.trim();
      },
      complete: (results) => {
        if (results.errors.length > 0) {
          const criticalErrors = results.errors.filter(e => e.type === 'Delimiter');
          if (criticalErrors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
            // Don't reject on non-critical errors
          }
        }
        
        if (!results.data || results.data.length === 0) {
          return reject(new Error('CSV file is empty or invalid'));
        }

        // Filter out completely empty rows
        const validData = results.data.filter(row => {
          return Object.values(row).some(val => val && val.trim() !== '');
        });

        resolve(validData);
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
};

/**
 * Validate product CSV data with comprehensive checks
 * @param {Array} data - Parsed CSV data
 * @returns {Object} Validation result with errors
 */
export const validateProductCSV = (data) => {
  const errors = [];
  const warnings = [];
  
  // Check if data exists
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      isValid: false,
      errors: ['No data found in CSV file'],
      warnings: [],
    };
  }

  // Required fields with flexible naming
  const requiredFieldMappings = {
    name: ['name', 'title', 'product_name', 'productname'],
    mrp: ['mrp', 'price', 'original_price', 'originalprice'],
    selling_price: ['selling_price', 'sellingprice', 'sale_price', 'saleprice'],
  };

  // Check for required columns in the first row
  const firstRow = data[0];
  const availableColumns = Object.keys(firstRow).map(k => k.toLowerCase());
  
  const missingFields = [];
  Object.entries(requiredFieldMappings).forEach(([field, variations]) => {
    const found = variations.some(v => availableColumns.includes(v));
    if (!found) {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    errors.push(`Missing required columns: ${missingFields.join(', ')}`);
  }

  // Validate each row
  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header row and 0-indexing
    
    // Get actual field names from row
    const name = getFieldValue(row, requiredFieldMappings.name);
    const mrp = getFieldValue(row, requiredFieldMappings.mrp);
    const sellingPrice = getFieldValue(row, requiredFieldMappings.selling_price);

    // Check required fields
    if (!name || name === 'NULL' || name === 'null') {
      errors.push(`Row ${rowNum}: Missing product name`);
    }

    if (!mrp || mrp === 'NULL' || mrp === 'null') {
      errors.push(`Row ${rowNum}: Missing MRP`);
    } else if (isNaN(parseFloat(mrp)) || parseFloat(mrp) <= 0) {
      errors.push(`Row ${rowNum}: Invalid MRP value "${mrp}"`);
    }

    if (!sellingPrice || sellingPrice === 'NULL' || sellingPrice === 'null') {
      errors.push(`Row ${rowNum}: Missing selling price`);
    } else if (isNaN(parseFloat(sellingPrice)) || parseFloat(sellingPrice) <= 0) {
      errors.push(`Row ${rowNum}: Invalid selling price value "${sellingPrice}"`);
    }

    // Validate price relationship
    const mrpNum = parseFloat(mrp);
    const sellingNum = parseFloat(sellingPrice);
    
    if (!isNaN(mrpNum) && !isNaN(sellingNum)) {
      if (sellingNum > mrpNum) {
        warnings.push(`Row ${rowNum}: Selling price (${sellingNum}) is greater than MRP (${mrpNum}) - will be accepted but verify pricing`);
      }
      
      
    }

    // Check for valid image URLs
    for (let i = 1; i <= 5; i++) {
      const imgField = getFieldValue(row, [`img${i}`, `image${i}`, `img_${i}`, `image_${i}`]);
      if (imgField && imgField !== 'NULL' && !isValidURL(imgField)) {
        warnings.push(`Row ${rowNum}: Invalid image URL format for img${i}`);
      }
    }

    // Validate stock if present
    const stock = getFieldValue(row, ['stock', 'quantity', 'qty']);
    if (stock && stock !== 'NULL' && stock !== '' && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
      warnings.push(`Row ${rowNum}: Invalid stock value "${stock}"`);
    }

    // Validate boolean fields
    const isActive = getFieldValue(row, ['is_active', 'isactive', 'active', 'is_show']);
    if (isActive && !['true', 'false', '1', '0', 'yes', 'no'].includes(isActive.toLowerCase())) {
      warnings.push(`Row ${rowNum}: Invalid is_active value "${isActive}" - will default to false`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalRows: data.length,
  };
};

/**
 * Get field value from row with flexible naming
 * @param {Object} row - Data row
 * @param {Array} fieldNames - Possible field name variations
 * @returns {string} Field value or null
 */
const getFieldValue = (row, fieldNames) => {
  for (const name of fieldNames) {
    const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
    if (key && row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return null;
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid URL
 */
const isValidURL = (url) => {
  if (!url || url === 'NULL' || url === '') return false;
  try {
    const urlObj = new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};

/**
 * Clean and format text content
 * Handles multiline content and special characters
 */
const cleanTextContent = (text) => {
  if (!text || text === 'NULL') return '';
  
  // Remove excessive quotes
  let cleaned = text.trim();
  
  // Remove surrounding quotes if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Normalize line breaks
  cleaned = cleaned.replace(/\\n/g, '\n');
  
  return cleaned;
};

/**
 * Format product data from CSV row
 * @param {Object} row - CSV row data
 * @returns {Object} Formatted product object
 */
export const formatProductFromCSV = (row) => {
  const images = [];
  
  // Collect all image URLs with flexible naming
  for (let i = 1; i <= 5; i++) {
    const imgValue = getFieldValue(row, [`img${i}`, `image${i}`, `img_${i}`, `image_${i}`]);
    if (imgValue && imgValue !== 'NULL' && imgValue !== '' && isValidURL(imgValue)) {
      images.push(imgValue.trim());
    }
  }
  
  // Get name with flexible field naming
  const name = getFieldValue(row, ['name', 'title', 'product_name', 'productname']) || '';
  const title2 = getFieldValue(row, ['title_2', 'full_name', 'fullname']) || name;
  
  // Get prices
  const mrp = parseFloat(getFieldValue(row, ['mrp', 'price', 'original_price', 'originalprice']) || 0);
  const sellingPrice = parseFloat(getFieldValue(row, ['selling_price', 'sellingprice', 'sale_price', 'saleprice']) || 0);
  
  // Get description and features - FIXED: Support both 'features' and 'fetaures' (typo in your CSV)
  const description = cleanTextContent(getFieldValue(row, ['description', 'desc', 'product_description']));
  const features = cleanTextContent(getFieldValue(row, ['features', 'fetaures', 'feature'])); // Added support for typo
  
  // Get category info
  const category = getFieldValue(row, ['category', 'cat', 'category_id']) || '';
  const subCategory = getFieldValue(row, ['subcategory', 'sub_category', 'subcat']) || '';
  
  // Get product variants
  const color = getFieldValue(row, ['color', 'colour']) || 'Default Title';
  const size = getFieldValue(row, ['size']) || 'NULL';
  const storage = getFieldValue(row, ['storage', 'capacity']) || 'NULL';
  
  // Get metadata
  const brand = getFieldValue(row, ['brand', 'manufacturer']) || '';
  const sku = getFieldValue(row, ['sku', 'product_id', 'unique_name']) || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const stock = parseInt(getFieldValue(row, ['stock', 'quantity', 'qty']) || 0);
  
  // Get flags
  const isActiveValue = getFieldValue(row, ['is_active', 'isactive', 'active', 'is_show']);
  const isFeaturedValue = getFieldValue(row, ['is_featured', 'isfeatured', 'featured']);
  
  // Parse boolean values
  const isActive = isActiveValue ? ['true', '1', 'yes'].includes(String(isActiveValue).toLowerCase()) : true;
  const isFeatured = isFeaturedValue ? ['true', '1', 'yes'].includes(String(isFeaturedValue).toLowerCase()) : false;
  
  // Get tags
  const tagsValue = getFieldValue(row, ['tags', 'keywords', 'labels']) || '';
  const tags = tagsValue ? tagsValue.split(',').map(tag => tag.trim()).filter(Boolean) : [];
  
  // Calculate discount percentage
  const discount = mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
  
  // Get additional fields
  const displayOrder = parseInt(getFieldValue(row, ['display_order', 'displayorder', 'order', 'index']) || 10000);
  
  return {
    title: name,
    title2: title2 || name,
    description: description,
    features: features,
    color: color,
    size: size,
    storage: storage,
    mrp: mrp,
    sellingPrice: sellingPrice,
    discount: discount,
    mainImage: images[0] || '',
    images: images,
    category: category,
    subCategory: subCategory,
    brand: brand,
    sku: sku,
    stock: stock,
    displayOrder: displayOrder,
    isActive: isActive,
    isFeatured: isFeatured,
    tags: tags,
    rating: 0,
    reviewCount: 0,
    soldCount: 0,
    viewCount: 0,
    metaTitle: '',
    metaDescription: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Generate CSV template for product upload
 * @returns {string} CSV template string
 */
export const generateCSVTemplate = () => {
  const template = [
    {
      name: 'Sample Product Name',
      description: 'Detailed product description goes here',
      features: 'Feature 1, Feature 2, Feature 3, Feature 4',
      mrp: '999',
      selling_price: '799',
      color: 'Black',
      size: 'M',
      storage: '64GB',
      img1: 'https://example.com/image1.jpg',
      img2: 'https://example.com/image2.jpg',
      img3: 'https://example.com/image3.jpg',
      img4: 'https://example.com/image4.jpg',
      img5: 'https://example.com/image5.jpg',
      category: '23',
      subcategory: 'Backpacks',
      brand: 'Sample Brand',
      sku: 'SKU001',
      unique_name: 'sample-product-unique-name',
      stock: '100',
      display_order: '10000',
      is_active: '1',
      is_featured: '0',
      tags: 'new,trending,bestseller',
    }
  ];
  
  return Papa.unparse(template);
};

/**
 * Download CSV template file
 */
export const downloadCSVTemplate = () => {
  const csv = generateCSVTemplate();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'product-upload-template.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export products to CSV
 * @param {Array} products - Products array to export
 * @param {string} filename - Output filename
 */
export const exportProductsToCSV = (products, filename = 'products-export.csv') => {
  const data = products.map(product => ({
    name: product.title,
    description: product.description,
    features: product.features,
    mrp: product.mrp,
    selling_price: product.sellingPrice,
    discount: product.discount,
    color: product.color,
    size: product.size,
    storage: product.storage,
    img1: product.images?.[0] || '',
    img2: product.images?.[1] || '',
    img3: product.images?.[2] || '',
    img4: product.images?.[3] || '',
    img5: product.images?.[4] || '',
    category: product.category,
    subcategory: product.subCategory,
    brand: product.brand,
    sku: product.sku,
    stock: product.stock,
    display_order: product.displayOrder,
    is_active: product.isActive ? '1' : '0',
    is_featured: product.isFeatured ? '1' : '0',
    tags: product.tags?.join(','),
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};