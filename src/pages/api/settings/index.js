// pages/api/settings/index.js

import connectToDatabase from '../../../utils/mongodb';
import Settings from '../../../models/Settings';
import { requireAdmin } from '../../../utils/auth';

connectToDatabase();

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return handleGet(req, res);
    if (req.method === 'PUT') return requireAdmin(handlePut)(req, res);

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

async function handleGet(req, res) {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({
      upi: {
        id: 'demo@upi',
        Gpay: true,
        Phonepe: true,
        Paytm: true,
        Bhim: true,
        WPay: false,
      },
      facebookPixel: { id: '', enabled: false },
      site: {
        name: 'Meesho Store',
        currency: 'INR',
        currencySymbol: '₹',
      },
      shipping: {},
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      upi: settings.upi || {},
      facebookPixel: settings.facebookPixel || {},
      site: settings.site || {},
      shipping: settings.shipping || {},
    },
  });
}

async function handlePut(req, res) {
  const body = req.body || {};

  let settings = await Settings.findOne();

  if (!settings) {
    settings = new Settings({
      upi: {
        id: body?.upi?.id || 'demo@upi',
        Gpay: !!body?.upi?.Gpay,
        Phonepe: !!body?.upi?.Phonepe,
        Paytm: !!body?.upi?.Paytm,
        Bhim: !!body?.upi?.Bhim,
        WPay: !!body?.upi?.WPay,
      },
      facebookPixel: body.facebookPixel || {},
      site: body.site || {},
      shipping: body.shipping || {},
    });
  } else {

    // ✅ ensure subdocs exist
    settings.upi = settings.upi || {};
    settings.facebookPixel = settings.facebookPixel || {};
    settings.site = settings.site || {};

    // ✅ UPI update safe
    if (body.upi) {
      settings.upi.id = body.upi.id || settings.upi.id || 'demo@upi';
      settings.upi.Gpay = !!body.upi.Gpay;
      settings.upi.Phonepe = !!body.upi.Phonepe;
      settings.upi.Paytm = !!body.upi.Paytm;
      settings.upi.Bhim = !!body.upi.Bhim;
      settings.upi.WPay = !!body.upi.WPay;
    }

    // ✅ other fields
    if (body.facebookPixel) {
      settings.facebookPixel.id = body.facebookPixel.id ?? settings.facebookPixel.id;
      settings.facebookPixel.enabled = !!body.facebookPixel.enabled;
    }

    if (body.site) {
      settings.site = { ...settings.site, ...body.site };
    }

    if (body.shipping) {
      settings.shipping = body.shipping;
    }
  }

  await settings.save();

  return res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    data: settings,
  });
}
