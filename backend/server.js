require('dotenv').config()

const express = require('express')
const cors=require('cors')

const app=express()

app.use(cors())

app.use(express.json()) //without this , req.body would be undefined
// it parse incoming json request bodies

app.get('/health',(req,res)=>{
    res.json({status:'server is running'})
})

const PORT=process.env.PORT || 5000

app.listen(PORT, ()=>{
    console.log(`Server running on Port ${PORT}`)
})
