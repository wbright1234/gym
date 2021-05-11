const nodemailer = require('nodemailer');
const key = require('./gsuite_serviceaccount_key.json');
const transporter = require('nodemailer').createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    type: 'OAuth2',
    user: '',
    serviceClient: key.client_id,
    privateKey: key.private_key
  }
});

exports.sendEmailAsync = ({ to, subject,  htmlContent }) => {
  var mailOptions = {}
  mailOptions = {
    from: 'info@740gym', // sender address (who sends)
    to, // list of receivers (who receives)
    subject, // Subject line
    html: htmlContent
  };
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log('Send email error: ', err);
    }
  });
}

exports.sendEmailSync = ({ to, subject, htmlContent }) => {
  return new Promise((res, rej) => {
    var mailOptions = {
      from: '', // sender address (who sends)
      to, // list of receivers (who receives)
      subject, // Subject line
      html: htmlContent
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) rej(err);
      res(info);
    });
  });
}
