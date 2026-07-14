// pages/admin/products/index.js
import { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import Link from 'next/link';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiEye, FiMenu, FiArrowUp, FiArrowDown, FiSave, FiX, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';

// ─── Sort config ─────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'order',          label: '☰  Custom Order'   },
  { value: 'title_asc',      label: 'Name A → Z',        field: 'title',        dir: 'asc'  },
  { value: 'title_desc',     label: 'Name Z → A',        field: 'title',        dir: 'desc' },
  { value: 'price_asc',      label: 'Price Low → High',  field: 'sellingPrice', dir: 'asc'  },
  { value: 'price_desc',     label: 'Price High → Low',  field: 'sellingPrice', dir: 'desc' },
  { value: 'stock_asc',      label: 'Stock Low → High',  field: 'stock',        dir: 'asc'  },
  { value: 'stock_desc',     label: 'Stock High → Low',  field: 'stock',        dir: 'desc' },
  { value: 'newest',         label: 'Newest First',      field: 'createdAt',    dir: 'desc' },
  { value: 'oldest',         label: 'Oldest First',      field: 'createdAt',    dir: 'asc'  },
  { value: 'active_first',   label: 'Active First',      field: 'isActive',     dir: 'desc' },
  { value: 'inactive_first', label: 'Inactive First',    field: 'isActive',     dir: 'asc'  },
];

function applySorting(list, sortValue) {
  const opt = SORT_OPTIONS.find((o) => o.value === sortValue);
  if (!opt || !opt.field) return list;
  return [...list].sort((a, b) => {
    let va = a[opt.field] ?? '';
    let vb = b[opt.field] ?? '';
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return opt.dir === 'asc' ? -1 : 1;
    if (va > vb) return opt.dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ─── Product Modal Component ─────────────────────────────────────
function ProductModal({ isOpen, onClose, product, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mrp: '',
    sellingPrice: '',
    stock: '',
    category: '',
    tags: '',
    isActive: true,
    mainImage: '',
    images: [],
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        mrp: product.mrp || '',
        sellingPrice: product.sellingPrice || '',
        stock: product.stock || '',
        category: product.category || '',
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
        isActive: product.isActive ?? true,
        mainImage: product.mainImage || '',
        images: product.images || [],
      });
      setImagePreview(product.mainImage || product.images?.[0] || null);
    } else {
      resetForm();
    }
  }, [product, isOpen]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      mrp: '',
      sellingPrice: '',
      stock: '',
      category: '',
      tags: '',
      isActive: true,
      mainImage: '',
      images: [],
    });
    setImagePreview(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setLoading(true);
      
      // Create FormData for file upload
      const uploadData = new FormData();
      uploadData.append('image', file);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadData,
      });

      const data = await response.json();
      
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          mainImage: data.url,
          images: [data.url, ...prev.images.filter(img => img !== data.url)]
        }));
        setImagePreview(data.url);
        toast.success('Image uploaded successfully');
      } else {
        toast.error(data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Product title is required');
      return;
    }
    if (!formData.sellingPrice || formData.sellingPrice <= 0) {
      toast.error('Valid selling price is required');
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const url = product ? `/api/products/${product._id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        mrp: parseFloat(formData.mrp) || 0,
        sellingPrice: parseFloat(formData.sellingPrice),
        stock: parseInt(formData.stock) || 0,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(product ? 'Product updated successfully' : 'Product created successfully');
        onSave();
        onClose();
        resetForm();
      } else {
        toast.error(data.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-2xl font-bold">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="modal-close-btn">
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Product Image */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image
              </label>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="image-preview-container">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="image-preview"
                        onError={(e) => { e.target.src = '/placeholder.png'; }}
                      />
                    ) : (
                      <div className="image-placeholder">
                        <FiUpload size={32} className="text-gray-400" />
                        <p className="text-sm text-gray-500 mt-2">No image</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    <FiUpload className="mr-2" />
                    {loading ? 'Uploading...' : 'Upload Image'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG, or WebP. Max size 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input w-full"
                placeholder="Enter product title"
                required
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input w-full"
                rows={4}
                placeholder="Enter product description"
              />
            </div>

            {/* MRP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MRP (₹)
              </label>
              <input
                type="number"
                name="mrp"
                value={formData.mrp}
                onChange={handleChange}
                className="input w-full"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                className="input w-full"
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="input w-full"
                placeholder="0"
                min="0"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input w-full"
                placeholder="e.g., Electronics, Clothing"
              />
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="input w-full"
                placeholder="Enter tags separated by commas"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate tags with commas (e.g., new, featured, bestseller)
              </p>
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">
                  Active (visible on storefront)
                </span>
              </label>
            </div>

          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-close-btn {
          padding: 0.5rem;
          border-radius: 8px;
          transition: background 0.2s;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #6b7280;
        }

        .modal-close-btn:hover {
          background: #f3f4f6;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .image-preview-container {
          width: 150px;
          height: 150px;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .image-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: #f9fafb;
        }

        @media (max-width: 640px) {
          .modal-content {
            max-height: 95vh;
          }
          
          .modal-header,
          .modal-body,
          .modal-footer {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function ProductsList() {
  const [products, setProducts]         = useState([]);
  const [displayed, setDisplayed]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [pagination, setPagination]     = useState(null);
  const [sortBy, setSortBy]             = useState('order');
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder]   = useState(false);

  // Modal state
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const dragIndex  = useRef(null);
  const [overIndex, setOverIndex] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/products?page=${page}&limit=50&search=${encodeURIComponent(search)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
        setPagination(data.pagination);
        setOrderChanged(false);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    setDisplayed(applySorting(products, sortBy));
  }, [products, sortBy]);

  // ── Modal handlers ─────────────────────────────────────────────
  const openAddModal = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleModalSave = () => {
    fetchProducts();
  };

  // ── Sort ───────────────────────────────────────────────────────
  const handleSortChange = (val) => {
    setSortBy(val);
    if (val !== 'order') setOrderChanged(false);
  };

  const toggleColumn = (ascVal, descVal) =>
    handleSortChange(sortBy === ascVal ? descVal : ascVal);

  const SortIcon = ({ asc, desc }) => {
    if (sortBy === asc)  return <FiArrowUp   size={11} style={{ color: '#ffc200', flexShrink: 0 }} />;
    if (sortBy === desc) return <FiArrowDown size={11} style={{ color: '#ffc200', flexShrink: 0 }} />;
    return <FiArrowUp size={11} style={{ opacity: 0.2, flexShrink: 0 }} />;
  };

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) { 
        toast.success('Product deleted successfully'); 
        fetchProducts(); 
      } else {
        toast.error(data.message || 'Failed to delete product');
      }
    } catch { 
      toast.error('Failed to delete product'); 
    }
  };

  // ── Toggle status ──────────────────────────────────────────────
  const toggleStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await response.json();
      if (data.success) { 
        toast.success('Status updated'); 
        fetchProducts(); 
      }
    } catch { 
      toast.error('Failed to update status'); 
    }
  };

  // ── Drag & drop ────────────────────────────────────────────────
  const handleDragStart = (index) => { dragIndex.current = index; };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex.current !== null && dragIndex.current !== index) setOverIndex(index);
  };

  const handleDrop = (dropIndex) => {
    if (dragIndex.current === null || dragIndex.current === dropIndex) return;
    const reordered = [...displayed];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(dropIndex, 0, moved);
    setDisplayed(reordered);
    setProducts(reordered);
    setOrderChanged(true);
    setSortBy('order');
    dragIndex.current = null;
    setOverIndex(null);
  };

  const handleDragEnd = () => { dragIndex.current = null; setOverIndex(null); };

  // ── Save order to server ───────────────────────────────────────
  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/products/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderedIds: displayed.map((p) => p._id) }),
      });
      const data = await res.json();
      if (data.success) { 
        toast.success('Order saved!'); 
        setOrderChanged(false); 
      } else {
        toast.error(data.message || 'Failed to save order');
      }
    } catch { 
      toast.error('Failed to save order'); 
    } finally { 
      setSavingOrder(false); 
    }
  };

  const discardOrder = () => { 
    setDisplayed(applySorting(products, 'order')); 
    setOrderChanged(false); 
  };

  const isDragMode  = sortBy === 'order';
  const showingFrom = pagination ? (page - 1) * pagination.limit + 1 : 0;
  const showingTo   = pagination ? Math.min(page * pagination.limit, pagination.total) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            {pagination && <p className="text-sm text-gray-500 mt-1">{pagination.total} total products</p>}
          </div>
          <button onClick={openAddModal} className="btn btn-primary">
            <FiPlus className="mr-2" /> Add Product
          </button>
        </div>

        {/* Unsaved order banner */}
        {orderChanged && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
            background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 16px',
          }}>
            <span style={{ fontSize: 14, color: '#92400e', fontWeight: 500 }}>
              ⚠️ You have unsaved order changes — click Save Order to apply on the storefront.
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={discardOrder} disabled={savingOrder} className="btn btn-sm btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <FiX size={13} /> Discard
              </button>
              <button onClick={saveOrder} disabled={savingOrder} className="btn btn-sm btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ffc200', border: 'none' }}>
                <FiSave size={13} /> {savingOrder ? 'Saving…' : 'Save Order'}
              </button>
            </div>
          </div>
        )}

        <div className="card">

          {/* Toolbar */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">

            {/* Search */}
            <div className="relative flex-1 w-full">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="input pl-10 w-full"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            {/* Sort dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <label style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>Sort by</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  style={{
                    appearance: 'none', WebkitAppearance: 'none',
                    padding: '8px 34px 8px 12px',
                    border: '1px solid #d1d5db', borderRadius: 8,
                    fontSize: 14, color: '#111827',
                    background: '#fff', cursor: 'pointer', minWidth: 185, outline: 'none',
                  }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', color: '#9ca3af', fontSize: 12,
                }}>▾</span>
              </div>
            </div>
          </div>

          {/* drag mode hint */}
          {isDragMode && !loading && displayed.length > 0 && (
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiMenu size={11} /> Drag rows to reorder. Changes won't save until you click Save Order.
            </p>
          )}

          {/* Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36, padding: '8px 4px' }} />
                  <th>Image</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleColumn('title_asc', 'title_desc')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Title <SortIcon asc="title_asc" desc="title_desc" />
                    </span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleColumn('price_asc', 'price_desc')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Price <SortIcon asc="price_asc" desc="price_desc" />
                    </span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleColumn('stock_asc', 'stock_desc')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Stock <SortIcon asc="stock_asc" desc="stock_desc" />
                    </span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleColumn('active_first', 'inactive_first')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Status <SortIcon asc="active_first" desc="inactive_first" />
                    </span>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="spinner w-8 h-8 mx-auto" />
                    </td>
                  </tr>
                ) : displayed.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">No products found</td>
                  </tr>
                ) : (
                  displayed.map((product, index) => (
                    <tr
                      key={product._id}
                      draggable={isDragMode}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      style={{
                        opacity: dragIndex.current === index ? 0.35 : 1,
                        background: overIndex === index ? '#fdf3fc' : undefined,
                        borderTop: overIndex === index ? '2px solid #ffc200' : undefined,
                        transition: 'background 0.12s, opacity 0.12s',
                      }}
                    >
                      <td style={{
                        width: 36, textAlign: 'center', padding: '8px 4px',
                        color: isDragMode ? '#9ca3af' : '#e5e7eb',
                        cursor: isDragMode ? 'grab' : 'default',
                      }}>
                        <FiMenu size={15} />
                      </td>

                      <td>
                        <img
                          src={product.mainImage || product.images?.[0] || '/placeholder.png'}
                          alt={product.title}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => { e.target.src = '/placeholder.png'; }}
                        />
                      </td>

                      <td className="font-medium max-w-xs truncate">{product.title}</td>

                      <td>
                        <div className="font-semibold">₹{product.sellingPrice}</div>
                        {product.mrp > product.sellingPrice && (
                          <div className="text-xs text-gray-500 line-through">₹{product.mrp}</div>
                        )}
                      </td>

                      <td>{product.stock ?? 0}</td>

                      <td>
                        <button
                          onClick={() => toggleStatus(product._id, product.isActive)}
                          className={`badge cursor-pointer ${product.isActive ? 'badge-success' : 'badge-danger'}`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td>
                        <div className="flex items-center space-x-2">
                          <Link href={`/product/${product._id}`} target="_blank"
                            className="btn btn-sm btn-secondary" title="View">
                            <FiEye />
                          </Link>
                          <button 
                            onClick={() => openEditModal(product)}
                            className="btn btn-sm btn-secondary" 
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                          <button onClick={() => handleDelete(product._id)}
                            className="btn btn-sm btn-danger" title="Delete">
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Showing {showingFrom} to {showingTo} of {pagination.total} results
              </p>
              <div className="flex space-x-2">
                <button onClick={() => setPage(page - 1)} disabled={page === 1}
                  className="btn btn-sm btn-secondary disabled:opacity-50">
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium">
                  Page {page} of {pagination.totalPages}
                </span>
                <button onClick={() => setPage(page + 1)} disabled={page === pagination.totalPages}
                  className="btn btn-sm btn-secondary disabled:opacity-50">
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={modalOpen}
        onClose={closeModal}
        product={editingProduct}
        onSave={handleModalSave}
      />
    </AdminLayout>
  );
}