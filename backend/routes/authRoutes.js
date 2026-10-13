const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const data_controller=require('../controllers/data_controller')
const axios = require("axios");
// Public routes
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

router.post('/logout', authController.logout);

// Protected routes
router.get('/me', protect, authController.getCurrentUser);
// Admin-only: switch into a seller account ("Login as Seller" under Tools)
router.post('/impersonate/:id', protect, authController.impersonate);
router.get('/users', authController.getAllUsers);

// Self-service profile (used by the Profile page)
router.get('/profile', protect, authController.getMyProfile);
router.put('/profile', protect, authController.updateMyProfile);
router.post('/change-password', protect, authController.changeMyPassword);
router.post('/verify-password', protect, authController.verifyMyPassword);


router.post('/updatePassword',authController.updatePassword)

router.post('/register',authController.register)

router.post('/seed-dummy', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DUMMY_SEED !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'Dummy seed is disabled in production'
      });
    }

    const { seedDummyData } = require('../scripts/seedDummyData');
    const result = await seedDummyData();
    return res.json(result);
  } catch (err) {
    console.error('seed-dummy error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to seed dummy data'
    });
  }
});

router.post('/getEkartToken',data_controller.getEkartToken)







router.post('/innofulfil_tracking_api',data_controller.innofulfil_tracking_api)
router.post('/ekart_tracking_api',data_controller.ekart_tracking_api)
router.post('/manualcreateOrder',data_controller.manualcreateOrder)
router.post('/mergecreateOrder',data_controller.mergecreateOrder)








router.post('/createWarehouse',data_controller.createWarehouse);
router.get('/getAllWarehouses',data_controller.getAllWarehouses);
router.get('/getWarehouseById/:id',data_controller.getWarehouseById);
router.put('/updateWarehouse/:id',data_controller.updateWarehouse);
router.delete('/deleteWarehouse/:id',data_controller.deleteWarehouse);


router.get('/getDashboardData', protect, data_controller.getDashboardData)

router.get('/getReportData',data_controller.getReportData)






//===========================bajajcode=======================================
const VALIDATION_API_URL = "http://vvapl.qerp.in/qerp/validatesno.asp";
const ACCESS_KEY = "vvapl_api_eLLxRPZqiNQsCJuyLUbiNP:4f73f874f67b31d25f2dbf6d2205283c70368991";
const Inventory = require('../models/Inventory');

/*
router.post("/validate-serial", async (req, res) => {
  try {
    const { materialCode, serialNumber, dealerCode } = req.body;

    const payload = {
      materialCode,
      serialNumber,
      dealerCode,
      accessKey: ACCESS_KEY
    };

    const response = await axios.post(VALIDATION_API_URL, payload, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json"
      }
    });

    const data = response.data;

    // Handle outdated API
    if (data.responseStatus === "-6") {
      return res.status(426).json({
        status: false,
        message: "Vendor API version is outdated. Please contact provider.",
        vendorResponse: data
      });
    }

    return res.json({
      status: true,
      data
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
});
*/

router.post("/validate-serial", async (req, res) => {
  try {
    const { materialCode, serialNumber, dealerCode, accessKey } = req.body;

    if (accessKey !== "vapl_api_eLLxRPZqiNQsCJuyLUbiNP:4f73f874f67b31d25f2dbf6d2205283c70368991") {
      return res.json({
        status: -1,
        message: "Invalid Access Key"
      });
    }

    const record = await Inventory.findOne({
      where: {
        Serial_Number: serialNumber
      }
    });

    if (!record) {
      return res.json({
        status: -1,
        message: "Invalid Serial Number"
      });
    }

    if (record.Item !== materialCode) {
      return res.json({
        status: -2,
        message: "Mismatch in model and serial number"
      });
    }

    if (record.Dealer_Code !== dealerCode) {
      return res.json({
        status: -5,
        message: "Serial Number not billed to this dealer"
      });
    }

    return res.json({
      status: 0,
      message: "Valid Serial Number"
    });

  } catch (error) {
    return res.status(500).json({
      status: -99,
      message: "Internal Server Error"
    });
  }
});






router.post('/inventory', async (req, res) => {
  try {
    let { Data } = req.body;

    if (!Array.isArray(Data) || Data.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Data array is required"
      });
    }

    const formattedData = Data.map(item => ({
      Serial_Number: item.Serial_Number,
      Item: item.Item,
      Stock_Item_Name: item.Stock_Item_Name,
      Batch_Serial_tracking_enabled: item.Batch_Serial_tracking_enabled,
      Dealer_Code: item.Dealer_Code,
      Invoice_Number: item.Invoice_Number || item[" Invoice_Number"],
      Invoice_Date: item.Invoice_Date
    }));

    const result = await Inventory.bulkCreate(formattedData);

    res.status(201).json({
      success: true,
      message: "Data inserted successfully",
      data: result
    });

  } catch (error) {
    console.error("Insert Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});



//===========================end=======================================




module.exports = router;
