
const express = require('express')
const app = express()

app.get('/', (req,res) => {
    console.log("Helloworld")
    res.send("Hi")
})

app.listen(4000)