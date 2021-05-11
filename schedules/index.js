const schedule = require('node-schedule');
const pool = require('../db_connection').pool;
const _ = require('lodash');
const AWS = require('aws-sdk');

const s3  = new AWS.S3({
  accessKeyId: process.env.BUCKETEER_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.BUCKETEER_AWS_SECRET_ACCESS_KEY,
  region: process.env.BUCKETEER_AWS_REGION
});

exports.scheduleMidnightJobs = () => {
  schedule.scheduleJob('0 10 * * *', () => {
    console.log('Run scheduled jobs');
    // Remove certificates that over 3 weeks are passed.
    var sql = 'SELECT * FROM bookings WHERE certUrl IS NOT NULL AND bookedDateTime < DATE(NOW() - INTERVAL 21 DAY)';
    pool.query(sql, [], (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        _.forEach(results, result => {
          const { id, certUrl } = result;
          const s3Key = _.split(certUrl, 'https://s3.' + process.env.BUCKETEER_AWS_REGION + '.amazonaws.com/' + process.env.BUCKETEER_BUCKET_NAME + '/', 2)[1];
          this.deleteFileOnS3(s3Key).then(() => {
            sql = 'UPDATE bookings SET certUrl=NULL WHERE id=?';
            pool.query(sql, [id]);
          });
        })
      }
    });
  });
}

exports.deleteFileOnS3 = (key) => {
  return new Promise((res, rej) => {
    var params = {
      Bucket: process.env.BUCKETEER_BUCKET_NAME,
      Key: key
    };
    s3.deleteObject(params, (err) => {
      if (err) {
        console.log('Delete file on S3 err:', err);
        rej(err);
      } else {
        res();
      }
    });
  });
}
