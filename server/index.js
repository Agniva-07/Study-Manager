const express=require('express');
const cors=require('cors');
const dotenv=require('dotenv');
const mongoose = require('mongoose') // MongoDB se baat karne wala package
const sessionRoutes = require('./routes/sessionRoutes');
const contractRoutes = require('./routes/contractRoutes');
const planRoutes = require('./routes/planRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const authRoutes = require('./routes/authRoutes');
const sectionRoutes = require("./routes/sectionRoutes");
const socialRoutes = require('./routes/socialRoutes');

dotenv.config();

const app=express();

//middlewares
app.use(cors({
  origin: "*"
}));       // frontend ko allow karo
app.use(express.json()) // incoming data ko JS object mein badlo
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use("/api/sections", sectionRoutes);
app.use('/api', socialRoutes);

//connection with mongodb
const connectDB=async ()=>{
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Database connected");
    } catch (error) {
        console.log(error);
    }
}
connectDB();

app.get('/',(req,res)=>{
    res.send('Hello World');
});

//port initialising and running
const PORT=process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});
