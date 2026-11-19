/** Keep development cache separate from production builds. */
module.exports = { distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next-prod' };
