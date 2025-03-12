var currDB = "mydb";
var mysql = require('mysql');
var con = mysql.createConnection({
   host: "localhost",
   user: "root",
   password: "mypassword",
   database: "mydb"
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
function removeEntry(){

}
function updateEntry(){

}
function tableCompile(){
   
}
var qry ="UPDATE employee SET salary=salary+500;";
con.connect(function (err) {
   if (err) throw err;
   console.log("Connected!");
   con.query(qry, function(err) {
      if (err) throw err;
      console.log("Records updated successfully");
   });
});