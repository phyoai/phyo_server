const mongoose = require("mongoose")

const userSchema = mongoose.Schema({
    name: String,
    email: String,
    password: String,
    mobileNumber: String,
    website: String,
    agencyName: String,
}, { timestamps: true })

const user = mongoose.model("user", userSchema)
module.exports = user