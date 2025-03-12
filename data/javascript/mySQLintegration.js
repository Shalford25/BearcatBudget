import {useState, useContext} from "react";// Step 1
function connectmySQL(){
var mysql = require('mysql');
var con = mysql.createConnection({
   host: "localhost",
   user: "root",
   password: "mypassword",
   database: "mydb"
});

var qry ="UPDATE employee SET salary=salary+500;";
con.connect(function (err) {
   if (err) throw err;
   console.log("Connected!");
   con.query(qry, function(err) {
      if (err) throw err;
      console.log("Records updated successfully");
   });
});
}