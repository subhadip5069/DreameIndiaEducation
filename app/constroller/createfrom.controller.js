const Form = require('../model/from');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const sharp = require('sharp');
require('dotenv').config();
const fs = require('fs');
// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// Multer Storage Configuration
const storage = multer.memoryStorage();
const upload = multer({ storage }).fields([
    { name: 'documents[aadharPhotos]', maxCount: 2 },
    { name: 'documents[studentPhotos]', maxCount: 2 }
]);

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ADMIN_EMAIL, // Using environment variables
        pass: process.env.ADMIN_PASSWORD
    }
});

exports.createForm = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            req.session.message = { type: 'danger', text:"Something went wrong & try again" , message:"Something went wrong & try again"  };
            res.redirect('/');
        }

        try {
   
            const { name, fatherName, mobileNo, date, occupation, aadharNo, amount, address, schoolDetails,email } = req.body;

            const user = await Form.findOne({ email });
            if (user) {
                req.session.message = { type: 'danger', text: 'User already exists' , message: 'User already exists' };
                res.redirect('/');
            }
            
            const compressAndSaveImage = async (file, prefix) => {
                const filename = `${Date.now()}-${prefix}${path.extname(file.originalname)}`;
                const outputPath = path.join('uploads', filename);
                await sharp(file.buffer)
                    .resize(800, 800, { fit: 'inside' })
                    .toFormat('jpeg')
                    .jpeg({ quality: 80 })
                    .toFile(outputPath);
                return outputPath;
            };

            const aadharPhotos = req.files['documents[aadharPhotos]']
                ? await Promise.all(req.files['documents[aadharPhotos]'].map(file => compressAndSaveImage(file, 'aadhar')))
                : [];

            const studentPhotos = req.files['documents[studentPhotos]']
                ? await Promise.all(req.files['documents[studentPhotos]'].map(file => compressAndSaveImage(file, 'student')))
                : [];

            const form = new Form({
                name,
                fatherName,
                email,
                mobileNo,
                date,
                occupation,
                aadharNo,
                amount,
                address,
                schoolDetails,
                documents: { aadharPhotos, studentPhotos }
            });

            await form.save();

            const mailOptionsUser = {
                from: process.env.ADMIN_EMAIL,
                to: `${email}`,
                subject: 'Form Submission Confirmation',
                html: `
                <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; box-shadow: 0px 4px 8px rgba(0,0,0,0.1); background: #fff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="/logo/WhatsApp Image 2025-03-18 at 10.54.56_c6ba014c.jpg" alt="Logo" style="max-width: 120px;">
                    </div>
                    <h2 style="color: #333; text-align: center; font-size: 22px; margin-bottom: 10px;">Form Submission Confirmation</h2>
                    <p style="color: #666; font-size: 16px;">Dear <strong>${name}</strong>,</p>
                    <p style="color: #666; font-size: 14px;">Your form has been successfully submitted. Here are your details:</p>
                    
                    <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; border-left: 4px solid #007BFF;">
                        <p style="font-size: 16px;"><strong>Name:</strong> ${name}</p>
                        <p style="font-size: 14px;"><strong>Father's Name:</strong> ${fatherName}</p>
                        <p style="font-size: 14px;"><strong>Mobile No:</strong> ${mobileNo}</p>
                        <p style="font-size: 14px;"><strong>Date:</strong> ${date}</p>
                        <p style="font-size: 14px;"><strong>Occupation:</strong> ${occupation}</p>
                        <p style="font-size: 14px;"><strong>Aadhar No:</strong> ${aadharNo}</p>
                        <p style="font-size: 14px;"><strong>Amount:</strong> ${amount}</p>
                    </div>
            
                    <h4 style="color: #444; margin-top: 20px; font-size: 18px;">Address Details</h4>
                    <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; border-left: 4px solid #28A745;">
                        <p><strong>District:</strong> ${address.district}</p>
                        <p><strong>State:</strong> ${address.state}</p>
                        <p><strong>Pincode:</strong> ${address.pincode}</p>
                    </div>
            
                    <h4 style="color: #444; margin-top: 20px; font-size: 18px;">School Details</h4>
                    <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; border-left: 4px solid #FFC107;">
                        <p><strong>School Name:</strong> ${schoolDetails.name}</p>
                        <p><strong>School Contact No:</strong> ${schoolDetails.contactNo}</p>
                        <p><strong>School District:</strong> ${schoolDetails.address.district}</p>
                        <p><strong>School State:</strong> ${schoolDetails.address.state}</p>
                        <p><strong>School Pincode:</strong> ${schoolDetails.address.pincode}</p>
                    </div>
            
                    <p style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">Thank you for applying!</p>
                </div>
                `
            };
            
            const mailOptionsAdmin = {
                from: process.env.ADMIN_EMAIL,
                to: process.env.ADMIN_EMAIL,
                subject: 'New Form Submission',
                html: `
                <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; box-shadow: 0px 4px 8px rgba(0,0,0,0.1); background: #fff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="/logo/WhatsApp Image 2025-03-18 at 10.54.56_c6ba014c.jpg" alt="Logo" style="max-width: 120px;">
                    </div>
                    <h2 style="color: #333; text-align: center; font-size: 22px; margin-bottom: 10px;">New Form Submission</h2>
                    <p style="color: #666; font-size: 16px;">A new form has been submitted with the following details:</p>
            
                    <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; border-left: 4px solid #007BFF;">
                        <p style="font-size: 16px;"><strong>Name:</strong> ${name}</p>
                        <p style="font-size: 14px;"><strong>Father's Name:</strong> ${fatherName}</p>
                        <p style="font-size: 14px;"><strong>Mobile No:</strong> ${mobileNo}</p>
                        <p style="font-size: 14px;"><strong>Date:</strong> ${date}</p>
                        <p style="font-size: 14px;"><strong>Occupation:</strong> ${occupation}</p>
                        <p style="font-size: 14px;"><strong>Aadhar No:</strong> ${aadharNo}</p>
                        <p style="font-size: 14px;"><strong>Amount:</strong> ${amount}</p>
                    </div>
            
                    <h4 style="color: #444; margin-top: 20px; font-size: 18px;">Address Details</h4>
                    <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; border-left: 4px solid #28A745;">
                        <p><strong>District:</strong> ${address.district}</p>
                        <p><strong>State:</strong> ${address.state}</p>
                        <p><strong>Pincode:</strong> ${address.pincode}</p>
                    </div>
            
                    <h4 style="color: #444; margin-top: 20px; font-size: 18px;">School Details</h4>
                    <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; border-left: 4px solid #FFC107;">
                        <p><strong>School Name:</strong> ${schoolDetails.name}</p>
                        <p><strong>School Contact No:</strong> ${schoolDetails.contactNo}</p>
                        <p><strong>School District:</strong> ${schoolDetails.address.district}</p>
                        <p><strong>School State:</strong> ${schoolDetails.address.state}</p>
                        <p><strong>School Pincode:</strong> ${schoolDetails.address.pincode}</p>
                    </div>
            
                    <p style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">Check the admin panel for more details.</p>
                </div>
                `
            };
            
            
            await transporter.sendMail(mailOptionsUser);
            await transporter.sendMail(mailOptionsAdmin);

            req.session.message = { type: 'success', text: 'Form submitted successfully!' };
            res.redirect('/'); // Adjust redirect as needed
        } catch (error) {
            console.error(error);
            req.session.message = { type: 'success', text: 'Form submition faild!' };
            res.redirect('/'); // Adjust redirect as needed
        }
    });
};
