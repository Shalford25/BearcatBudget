var mysql = require('mysql');
var con = mysql.createConnection({
   host: "localhost",
   user: "root",
   password: "mypassword",
   database: "bearcatbudget"
});

var currentTable = "";
function currTable(tableName){
   currentTable = tableName;
   console.log("Current Table: "+currentTable);
}

function addEntry(entryData){
   if (currentTable === "") {
      console.log("No table selected.");
      return;
   }
   
   var columns = Object.keys(entryData).join(", ");
   var values = Object.values(entryData).map(value => `'${value}'`).join(", ");
   var sql = `INSERT INTO ${currentTable} (${columns}) VALUES (${values})`;

   con.query(sql, function (err, result) {
      if (err) throw err;
      console.log("1 record inserted");
   });
}

function removeEntry(entryRemove){
   if (currentTable === "") {
      console.log("No table selected.");
      return;
   }

   var sql = `DELETE FROM ${currentTable} WHERE ${entryRemove}`;

   con.query(sql, function (err, result) {
      if (err) throw err;
      console.log("1 record deleted");
   });
}

function updateEntry(entryData){
   if (currentTable === "") {
      console.log("No table selected.");
      return;
   }
   
   var columns = Object.keys(entryData).join(", ");
   var values = Object.values(entryData).map(value => `'${value}'`).join(", ");
   var sql = `INSERT INTO ${currentTable} (${columns}) VALUES (${values})`;

   con.query(sql, function (err, result) {
      if (err) throw err;
      console.log("1 record inserted");
   });
}

function tableGraphCompile(){
   
}