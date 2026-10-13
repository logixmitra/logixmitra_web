const axios = require('axios');
const crypto = require('crypto');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const helmet = require('helmet');
const sequelize = require('./config/database');
const sequelize1 = require('./config/databasetest');

const cron = require('node-cron');
const { updateAllOrdersTracking } = require('./services/trackingService');
const orderService = require('./services/orderService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mime = require("mime-types");
const ExcelJS = require("exceljs");
const trackingRoutes = require('./routes/tracking');
dotenv.config();
require('./models');
const { Order, OrderItem,Shipment,Seller,User,Warehouse,Wallet,Integration,Ordertest } = require('./models');

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const WalletRoutes = require('./routes/WalletRoutes');
const b2bRoutes = require('./routes/b2bRoutes');
const nodemailer = require('nodemailer');
const app = express();
// URL normalization middleware (must run before any route matching):
// 1. The frontend base URLs sometimes end with a trailing slash, so calls like
//    `${API_BASE_URL}/users/12` become `/api//users/12`. Express matches paths
//    exactly and answered 404 "Route not found" for the duplicate slash.
// 2. Upload-related frontend calls are built as `${UPLOAD_BASE_URL}/...` where
//    UPLOAD_BASE_URL ends in `/upload` (e.g. `/upload/read-excel`), but the
//    backend registers those routes at the root (`/read-excel`, `/upload`,
//    `/uploads/...`, `/preview/...`). Strip the `/upload/` alias prefix so both
//    URL shapes resolve to the same handler.
app.use((req, res, next) => {
  const q = req.url.indexOf('?');
  const pathPart = q >= 0 ? req.url.slice(0, q) : req.url;
  const queryPart = q >= 0 ? req.url.slice(q) : '';
  let normalized = pathPart.replace(/\/{2,}/g, '/');
  if (normalized.startsWith('/upload/')) {
    normalized = normalized.slice('/upload'.length);
  }
  if (normalized !== pathPart) {
    req.url = normalized + queryPart;
  }
  next();
});
// app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({
  limit: '70mb',
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.includes("/cashfree/webhook")) {
      req.rawBody = buf;
    }
  }
}));

app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: false,
  })
);
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
});

app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors https://myshopify.com https://admin.shopify.com https://app.logixmitra.com http://localhost:8080;"
  );
  next();
});

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Folder where files will be saved
    },
    filename: (req, file, cb) => {
        // Create a unique filename: timestamp + original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 2. Initialize Multer
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit: 5MB
    fileFilter: (req, file, cb) => {
        // Optional: Filter by file type
        const fileTypes = /jpeg|jpg|png|webp|gif|pdf/;
        const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
        if (extName) {
            return cb(null, true);
        }
        cb(new Error('Error: Only images and PDFs allowed!'));
    }
});

// 3. The API Route
// 'file' must match the name attribute in your frontend form/request
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: 'Please upload a file' });
        }
        res.status(200).send({
            message: 'File uploaded successfully',
            fileInfo: req.file
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});


// let rto = [
//     {
//         "orderNumber": "2451-clone1",
//         "charge": 42,
//         "totalrate": 25
//     },

// ]

let alljson={}

const rtochange=async()=>{

 


let userbal={"19":9500,"10":98000,"11":88700}
let wa=await Wallet.findAll({})
for(let x of wa){
        if(userbal[x.user_id] && (x.status.toLowerCase().includes("debit") || x.status.toLowerCase().includes("credit"))){
          userbal[x.user_id]=x.status.toLowerCase().includes("debit")?userbal[x.user_id]-x.amount:userbal[x.user_id]+x.amount
            

        }
     

}


console.log(userbal,"userbaluserbaluserbaluserbaluserbaluserbal")




}

      setTimeout(()=>{
        // rtochange() 

      },10000) 





      const settorderupdate=async()=>{




        const orders = await Ordertest.findAll({ where:{
          platform: "Shopify",
        }});
for (const item of orders) {
  try{
       const transaction = await sequelize.transaction();

  const data = item.toJSON();
  // Primary key aur timestamps hata do
  delete data.id;
  delete data.createdAt;
  delete data.updatedAt;

  await Order.update(data, {
    where: {
      referenceId: item.referenceId,
    },
  },{ transaction });
 await transaction.commit();


  }
  catch(err){
    await transaction.rollback();

    console.log(err,"errerrerrerrerrerrerrerrerrerrerrerr")
  }


}



                         

      }
      // settorderupdate()


    
let alldatajson=[]


















const getjsonfun=async()=>{
  if(alldatajson.length==0){
        const filePath = path.join(__dirname, 'uploads', 'zonetest.xlsx');

 
    const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
  entries: "emit",
  sharedStrings: "cache",
  hyperlinks: "ignore",
  styles: "ignore",
  worksheets: "emit",
});
      for await (const worksheet of workbook) {
      console.log("Sheet:", worksheet.name);
for await (const row of worksheet) {

  alldatajson.push(row.values)
}}


  }
}
getjsonfun()







const CREDENTIALS = {
    loginId: 'GG940111',
    licenseKey: 'kh7mnhqkmgegoksipxr0urmqesesseup',
    originArea: 'GGN',
    customerCode: '940111'
};




app.post('/testbludart', async (req, res) => {
    console.log('\n🚀 Testing all authentication methods...');
    
    const baseUrl = 'https://apigateway-sandbox.bluedart.com/in/transportation/finder/v1/GetServicesforPincode?pincode=110001';
    const results = {};
    
    // METHOD 1: Basic Auth
    try {
        console.log('🔑 Testing Basic Auth...');
        const encoded = Buffer.from(`${CREDENTIALS.loginId}:${CREDENTIALS.licenseKey}`).toString('base64');
        const response = await axios.get(baseUrl, {
            headers: { 'Authorization': `Basic ${encoded}`, 'Accept': 'application/json' },
            timeout: 10000
        });
        results['Basic Auth'] = { success: true, status: response.status, data: response.data };
        console.log('✅ Basic Auth - SUCCESS');
    } catch (error) {
        results['Basic Auth'] = { success: false, error: error.response?.data || error.message, status: error.response?.status };
        console.log('❌ Basic Auth - FAILED');
    }

    // METHOD 2: API Key
    try {
        console.log('🔑 Testing API Key...');
        const response = await axios.get(baseUrl, {
            headers: { 'X-API-Key': CREDENTIALS.licenseKey, 'Accept': 'application/json' },
            timeout: 10000
        });
        results['API Key'] = { success: true, status: response.status, data: response.data };
        console.log('✅ API Key - SUCCESS');
    } catch (error) {
        results['API Key'] = { success: false, error: error.response?.data || error.message, status: error.response?.status };
        console.log('❌ API Key - FAILED');
    }

    // METHOD 3: Bearer Token
    try {
        console.log('🔑 Testing Bearer Token...');
        const token = Buffer.from(JSON.stringify({
            loginId: CREDENTIALS.loginId,
            licenseKey: CREDENTIALS.licenseKey,
            exp: Date.now() + 3600000
        })).toString('base64');
        const response = await axios.get(baseUrl, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            timeout: 10000
        });
        results['Bearer Token'] = { success: true, status: response.status, data: response.data };
        console.log('✅ Bearer Token - SUCCESS');
    } catch (error) {
        results['Bearer Token'] = { success: false, error: error.response?.data || error.message, status: error.response?.status };
        console.log('❌ Bearer Token - FAILED');
    }

    // METHOD 4: Custom Headers
    try {
        console.log('🔑 Testing Custom Headers...');
        const response = await axios.get(baseUrl, {
            headers: {
                'loginId': CREDENTIALS.loginId,
                'licenseKey': CREDENTIALS.licenseKey,
                'originArea': CREDENTIALS.originArea,
                'customerCode': CREDENTIALS.customerCode,
                'X-LoginId': CREDENTIALS.loginId,
                'X-LicenseKey': CREDENTIALS.licenseKey,
                'X-OriginArea': CREDENTIALS.originArea,
                'X-CustomerCode': CREDENTIALS.customerCode,
                'clientID': CREDENTIALS.loginId,
                'clientSecret': CREDENTIALS.licenseKey,
                'Accept': 'application/json'
            },
            timeout: 10000
        });
        results['Custom Headers'] = { success: true, status: response.status, data: response.data };
        console.log('✅ Custom Headers - SUCCESS');
    } catch (error) {
        results['Custom Headers'] = { success: false, error: error.response?.data || error.message, status: error.response?.status };
        console.log('❌ Custom Headers - FAILED');
    }

    // METHOD 5: Digest Auth
    try {
        console.log('🔑 Testing Digest Auth...');
        const nonce = crypto.randomBytes(16).toString('hex');
        const realm = 'BlueDart';
        const hash = crypto.createHash('md5')
            .update(`${CREDENTIALS.loginId}:${realm}:${CREDENTIALS.licenseKey}`)
            .digest('hex');
        const digest = `username="${CREDENTIALS.loginId}", realm="${realm}", nonce="${nonce}", uri="/in/transportation/finder/v1/GetServicesforPincode", response="${hash}"`;
        const response = await axios.get(baseUrl, {
            headers: { 'Authorization': `Digest ${digest}`, 'Accept': 'application/json' },
            timeout: 10000
        });
        results['Digest Auth'] = { success: true, status: response.status, data: response.data };
        console.log('✅ Digest Auth - SUCCESS');
    } catch (error) {
        results['Digest Auth'] = { success: false, error: error.response?.data || error.message, status: error.response?.status };
        console.log('❌ Digest Auth - FAILED');
    }

    // METHOD 6: OAuth 2.0
    try {
        console.log('🔑 Testing OAuth 2.0...');
        const tokenResponse = await axios.post(
            'https://apigateway-sandbox.bluedart.com/in/transportation/token/v1/login',
            {
                client_id: CREDENTIALS.loginId,
                client_secret: CREDENTIALS.licenseKey,
                grant_type: 'client_credentials'
            },
            {
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                timeout: 10000
            }
        );
        const token = tokenResponse.data.access_token || tokenResponse.data.token;
        if (token) {
            const response = await axios.get(baseUrl, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                timeout: 10000
            });
            results['OAuth 2.0'] = { success: true, status: response.status, data: response.data };
            console.log('✅ OAuth 2.0 - SUCCESS');
        } else {
            results['OAuth 2.0'] = { success: false, error: 'No token received' };
            console.log('❌ OAuth 2.0 - FAILED (No token)');
        }
    } catch (error) {
        results['OAuth 2.0'] = { success: false, error: error.response?.data || error.message, status: error.response?.status };
        console.log('❌ OAuth 2.0 - FAILED');
    }

    // ============================================
    // SUMMARY
    // ============================================
    const successful = Object.values(results).filter(r => r.success === true).length;
    const total = Object.keys(results).length;
    const workingMethod = Object.keys(results).find(key => results[key].success === true);

    console.log(`\n📊 Summary: ${successful}/${total} methods worked`);

    res.json({
        summary: {
            total: total,
            successful: successful,
            failed: total - successful,
            workingMethod: workingMethod || 'None',
            allPassed: successful === total
        },
        message: workingMethod ? 
            `✅ SUCCESS! Use "${workingMethod}" method for your API calls.` : 
            '❌ NO METHOD WORKED. Please contact Blue Dart support.',
        results: results,
        credentials: CREDENTIALS,
        nextSteps: workingMethod ? [
            `1. Use "${workingMethod}" for all Blue Dart API calls`,
            '2. Test tracking: POST /track with AWB number',
            '3. Ready for production integration'
        ] : [
            '1. Contact Blue Dart support: api.support@bluedart.com',
            '2. Share this error: "All authentication methods failed with 401"',
            '3. Ask for: Correct auth method, IP whitelisting, or new credentials',
            '4. Your IP: ' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown')
        ],
        timestamp: new Date().toISOString()
    });
});







app.get("/amazone/callback", async (req, res) => {
  const { spapi_oauth_code, state } = req.query;

  console.log(spapi_oauth_code);

  res.send("Amazon authorization success");
});

app.post("/read-excel", async (req, res) => {
  try {
    // static excel file path
    let pin1 = req.body.pin1;
    let pin2 = req.body.pin2;

      


    let column=-1
    let row_=-1

    




    // pincode data is required to locate the zone
  if (!pin1 || !pin2) {
    return res.status(400).json({ success: false, message: "pin1 and pin2 are required" });
  }

  console.log(alldatajson.length,"alldatajsonalldatajsonalldatajsonalldatajsonalldatajsonalldatajsonalldatajsonalldatajsonalldatajson")



   for(let x in alldatajson){

   
  if(x==0){

    for(let i=0;i<alldatajson[x].length;i++){
      let tmpdata=alldatajson[x][i] ?alldatajson[x][i].toLowerCase():"";
      let r1=pin1.city+"_"+pin1.state
      let r2=pin1.district+"_"+pin1.state

      
      if(tmpdata==r1 || tmpdata==r2){
          column=i
          break
      }
    }       
      

     
     
    
  }
  else{
      let tmpdata=alldatajson[x][1] ?alldatajson[x][1].toLowerCase():"";
      let r1=pin2.city+"_"+pin2.state
      let r2=pin2.district+"_"+pin2.state
      // console.log(tmpdata,r1,r2,"tmpdata",tmpdata==r1,tmpdata==r2,alldatajson[x])

      if(tmpdata==r1||tmpdata==r2){
    row_=x
          
          break
    }

      
  }
}

console.log(column,"column",row_,"row_" )

  

  let zone={
    "A":"ZONE A",
    "B":"ZONE B",
    "C":"ZONE C",
    "C1":"ZONE C",
    "C2":"ZONE C",
    "C3":"ZONE C",
    "D":"ZONE D",
    "D1":"ZONE D",
    "D2":"ZONE D",
    "D3":"ZONE D",
    "E":"ZONE E",
    "F":"ZONE E",  


  }
    // When pin1/pin2 don't exist in the sheet, row_ or column stays -1 and
    // alldatajson[-1] is undefined — accessing it used to throw "Cannot read
    // properties of undefined (reading '-1')" (500) instead of returning the
    // designed "Zone not found" response the frontend falls back on.
    const zoneCell =
      row_ >= 0 && column >= 0 && Array.isArray(alldatajson[row_])
        ? alldatajson[row_][column]
        : undefined;
    res.json({
      success: true,
      total: alldatajson.length,
      data___:row_+"b"+column,
      data: zone[zoneCell] || zoneCell || "Zone not found",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Serve an uploaded file as an inline HTML preview (iframe + data URL) so the
// file opens inside the app instead of downloading.
//
// The frontend builds this URL as `${UPLOAD_BASE_URL}/preview/<file>` where
// UPLOAD_BASE_URL already ends in "/upload", so the incoming path is
// "/upload/preview/<file>". Two things must resolve that to this handler:
//   1. the URL-normalization middleware above strips the "/upload" alias, or
//   2. this route is ALSO registered under the "/upload/preview/:filename"
//      alias.
// Registering BOTH shapes makes the endpoint work even when the normalization
// middleware is missing (e.g. an older deploy) — otherwise the request falls
// through to the catch-all 404 {"success":false,"error":"Route not found"}.
const serveUploadPreview = (req, res) => {
    try {
        const fileName = req.params.filename;

        const filePath = path.join(__dirname, 'uploads', fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }

        const fileBuffer = fs.readFileSync(filePath);

        const mimeType = mime.lookup(filePath) || 'application/octet-stream';

        const base64 = fileBuffer.toString('base64');

        const dataUrl = `data:${mimeType};base64,${base64}`;

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>File Preview</title>
                <style>
                    body { margin:0; }
                    iframe { width:100%; height:100vh; border:none; }
                </style>
            </head>
            <body>
                <iframe src="${dataUrl}"></iframe>
            </body>
            </html>
        `);

    } catch (err) {
        res.status(500).send(err.message);
    }
};

// Canonical path (used after the "/upload" alias is stripped by the
// middleware) + the raw "/upload/preview/:filename" shape the frontend
// actually requests. Both point at the same handler.
app.get('/preview/:filename', serveUploadPreview);
app.get('/upload/preview/:filename', serveUploadPreview);


const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true, // true for port 465
  auth: {
    user: 'admin@logixmitra.com',
    pass: 'Vishnu@1@1@1',
  },
});


transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

// Contact form submission endpoint
app.post('/api/contact', async (req, res) => {
  const { fullName, email, phone, monthlyOrders, message } = req.body;

  // Validate required fields
  if (!fullName || !email || !phone || !monthlyOrders || !message) {
    return res.status(400).json({
      success: false,
      error: 'All fields are required',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format',
    });
  }

  try {
    // Email to admin (LogixMitra team)
    const adminMailOptions = {
      from: `"LogixMitra Contact" <admin@logixmitra.com>`,
      to: 'admin@logixmitra.com',
      replyTo: email,
      subject: `New Contact Form Submission from ${fullName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-top: 5px; color: #333; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Contact Form Submission</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Full Name:</div>
                <div class="value">${fullName}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value">${email}</div>
              </div>
              <div class="field">
                <div class="label">Phone:</div>
                <div class="value">${phone}</div>
              </div>
              <div class="field">
                <div class="label">Monthly Orders:</div>
                <div class="value">${monthlyOrders}</div>
              </div>
              <div class="field">
                <div class="label">Message:</div>
                <div class="value">${message.replace(/\n/g, '<br>')}</div>
              </div>
            </div>
            <div class="footer">
              <p>This message was sent from the LogixMitra contact form.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        New Contact Form Submission
        
        Full Name: ${fullName}
        Email: ${email}
        Phone: ${phone}
        Monthly Orders: ${monthlyOrders}
        
        Message:
        ${message}
        
        ---
        This message was sent from the LogixMitra contact form.
      `,
    };

    // Auto-reply to customer
    const customerMailOptions = {
      from: `"LogixMitra Support" <admin@logixmitra.com>`,
      to: email,
      subject: 'Thank you for contacting LogixMitra!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .button { display: inline-block; padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Welcome to LogixMitra!</h2>
            </div>
            <div class="content">
              <p>Dear ${fullName},</p>
              <p>Thank you for reaching out to LogixMitra! We've received your message and our shipping experts will get back to you within <strong>2 hours</strong> during business hours.</p>
              <p>Here's what you shared with us:</p>
              <ul>
                <li><strong>Monthly Orders:</strong> ${monthlyOrders}</li>
                <li><strong>Phone:</strong> ${phone}</li>
              </ul>
              <p>While you wait, here are some resources that might help:</p>
              <ul>
                <li>ðŸ“¦ Check our <a href="https://logixmitra.com/pricing">shipping rates</a></li>
                <li>ðŸšš Learn about our <a href="https://logixmitra.com/features">features</a></li>
                <li>ðŸ’¡ Read our <a href="https://logixmitra.com/blog">shipping guide</a></li>
              </ul>
              <a href="https://logixmitra.com" class="button">Visit LogixMitra</a>
              <p style="margin-top: 20px;">Best regards,<br><strong>The LogixMitra Team</strong></p>
            </div>
            <div class="footer">
              <p>Need immediate assistance? Call us at +91 8505960455</p>
              <p>Support hours: Monâ€“Sat, 9amâ€“9pm IST | 24Ã—7 chat support</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Thank you for contacting LogixMitra!
        
        Dear ${fullName},
        
        Thank you for reaching out to LogixMitra! We've received your message and our shipping experts will get back to you within 2 hours during business hours.
        
        Here's what you shared with us:
        - Monthly Orders: ${monthlyOrders}
        - Phone: ${phone}
        
        While you wait, check out our website: https://logixmitra.com
        
        Best regards,
        The LogixMitra Team
        
        Need immediate assistance? Call us at +91 8505960455
        Support hours: Monâ€“Sat, 9amâ€“9pm IST | 24Ã—7 chat support
      `,
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(customerMailOptions),
    ]);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully! We will get back to you within 2 hours.',
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again later.',
    });
  }
});




app.use('/uploads', express.static('uploads'));
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/wallets', WalletRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/b2b', b2bRoutes);


app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/innofulfill-webhook', async (req, res) => {
  try {
    const eventData = req.body || {};
    console.log('Received Webhook:', JSON.stringify(eventData, null, 2));

    // V2 payload: data.awbNumber / data.orderStatus; legacy: awb_number / status
    const data = eventData.data || eventData;
    const status = data.orderStatus || eventData.status;
    const awbNumber = data.awbNumber || eventData.awb_number;
    const orderId = data.orderId || eventData.orderId;
    const referenceId = data.referenceId || data.referenceNumber;

    console.log(`AWB: ${awbNumber} orderId: ${orderId} is now ${status}`);

    if (awbNumber || referenceId) {
      const Order = require('./models/Order');
      const where = awbNumber
        ? { awb: String(awbNumber) }
        : { referenceId: String(referenceId) };

      let mappedStatus = status;
      if (status) {
        const s = String(status).toUpperCase();
        if (s === 'DELIVERED') mappedStatus = 'Delivered';
        else if (s === 'CANCELLED' || s === 'CANCELED') mappedStatus = 'Cancelled';
        else if (s.includes('RTO')) mappedStatus = 'Return to Origin';
        else if (s.includes('OUT_FOR_DELIVERY')) mappedStatus = 'Out for Delivery';
        else if (s.includes('IN_TRANSIT') || s.includes('DISPATCHED')) mappedStatus = 'In Transit';
        else if (s.includes('PICK')) mappedStatus = 'Picked Up';
      }

      const update = {};
      if (mappedStatus) {
        const OrderRow = await Order.findOne({ where });
        const current = String(OrderRow?.status || '').toLowerCase();
        const next = String(mappedStatus || '').toLowerCase();
        const currentIsRto = current.includes('rto') || current.includes('return to origin');
        const nextIsRto = next.includes('rto') || next.includes('return to origin');
        if (currentIsRto && !nextIsRto) {
          if (next === 'delivered') update.status = 'RTO Delivered';
        } else {
          update.status = mappedStatus;
        }
      }
      if (orderId) update.trackingnumber = String(orderId);

      if (Object.keys(update).length) {
        await Order.update(update, { where });
      }
    }

    res.status(200).send('Webhook Received');
  } catch (err) {
    console.error('InnoFulfill webhook error:', err.message);
    res.status(200).send('Webhook Received');
  }
});

app.get('/', (req, res) => {
  res.send('Working âœ… Shopify iframe ready');
});

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

let trackingCronRunning = false;
let trackingCronStartedAt = 0;
const TRACKING_CRON_MAX_MS = 4 * 60 * 1000;


// setTimeout(()=>{
// updateAllOrdersTracking()
// },10000)

async function runTrackingUpdateJob(reason) {
  if (trackingCronRunning && Date.now() - trackingCronStartedAt < TRACKING_CRON_MAX_MS) {
    console.log(`Tracking cron skipped (${reason}): previous run still in progress`);
    return { success: false, skipped: true };
  }
  trackingCronRunning = true;
  trackingCronStartedAt = Date.now();
  console.log(`Running tracking update job (${reason})...`);
  try {
    const result = await Promise.race([
      updateAllOrdersTracking()
      ,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tracking job timed out after 4 minutes')), TRACKING_CRON_MAX_MS)
      ),
    ]);
    if (result?.success) {
      console.log(
        `Tracking job completed (${reason}): ${result.updatedCount}/${result.totalOrders} orders updated`
      );
    } else {
      console.error(`Tracking job failed (${reason}):`, result?.error);
    }
    return result;
  } catch (error) {
    console.error(`Error in tracking update (${reason}):`, error);
    return { success: false, error: error.message };
  } finally {
    trackingCronRunning = false;
  }
}

// function startTrackingCron() {
//   const task = cron.schedule(
//     '*/5 * * * *',
//     async () => {
//       await runTrackingUpdateJob('scheduled');
//     },
//     {
//       timezone: 'Asia/Kolkata',
//       noOverlap: true,
//       name: 'tracking-update',
//     }
//   );
//   const nextRun = typeof task.getNextRun === 'function' ? task.getNextRun() : null;
//   console.log(
//     'Tracking cron registered: every 5 minutes (Asia/Kolkata)',
//     nextRun ? `Next run: ${nextRun.toISOString()}` : ''
//   );
//   setTimeout(() => {
//     runTrackingUpdateJob('startup').catch((error) => {
//       console.error('Startup tracking update failed:', error);
//     });
//   }, 15000);
// }

let weightDisputeCronRunning = false;

async function runWeightDisputeAutoApproveJob(reason) {
  if (weightDisputeCronRunning) {
    console.log(`Weight dispute auto-approve skipped (${reason}): previous run still in progress`);
    return { skipped: true };
  }
  weightDisputeCronRunning = true;
  console.log(`Running weight dispute auto-approve job (${reason})...`);
  try {
    const result = await orderService.autoApproveExpiredWeightDisputes();
    console.log(
      `Weight dispute auto-approve (${reason}): processed=${result.processed} approved=${result.approved} deducted=${result.deducted} failed=${result.failed} skipped=${result.skipped}`
    );
    return result;
  } catch (error) {
    console.error(`Weight dispute auto-approve failed (${reason}):`, error);
    return { success: false, error: error.message };
  } finally {
    weightDisputeCronRunning = false;
  }
}

function startWeightDisputeAutoApproveCron() {
  cron.schedule(
    '15 * * * *',
    async () => {
      await runWeightDisputeAutoApproveJob('scheduled');
    },
    {
      timezone: 'Asia/Kolkata',
      noOverlap: true,
      name: 'weight-dispute-auto-approve',
    }
  );
  console.log('Weight dispute auto-approve cron registered: every hour at :15 (Asia/Kolkata)');
  setTimeout(() => {
    runWeightDisputeAutoApproveJob('startup').catch((error) => {
      console.error('Startup weight dispute auto-approve failed:', error);
    });
  }, 20000);
}

async function runManualTrackingUpdate() {
  console.log('Manual tracking update triggered...');
  return runTrackingUpdateJob('manual');
}


const PORT = process.env.PORT || 5000;

sequelize
  .authenticate()
  .then(() => {
    console.log('Database connected successfully');
    return sequelize.sync({ alter:true }); 
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      //startTrackingCron();
      startWeightDisputeAutoApproveCron();
    });
  })
  .catch((err) => {
    console.error('Unable to connect to database:', err);
    process.exit(1);
  });

  sequelize1
  .authenticate()
  .then(() => {
    console.log('Test database connected successfully');
  })
  .catch((err) => {
    console.error('Unable to connect to test database:', err);
  });


process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  sequelize.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  sequelize.close();
  process.exit(0);
});

module.exports = {
  runManualTrackingUpdate,
};
