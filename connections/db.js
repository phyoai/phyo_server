const mongoose = require("mongoose")
const dns = require("dns").promises

function connectToMongo (URL) {
    console.log('1. Starting connection...');

    // Try with Google DNS as fallback
    dns.setServers(['8.8.8.8', '8.8.4.4']);

    return mongoose.connect(URL, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        directConnection: false,
    })
    .then(() => {
        console.log('3. ✓ Connection successful');
        return mongoose.connection;
    })
    .catch(err => {
        console.log('6. Error message:', err);
        throw err;
    });
}


module.exports = {
    connectToMongo
}