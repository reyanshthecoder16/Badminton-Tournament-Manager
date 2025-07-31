const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const db = require('../config/db');
const Player = require('../models/Player');

async function manualImportPlayers() {
  try {
    console.log('🔄 Starting manual player import...');
    
    // Sync database
    await db.sync({ alter: true });
    console.log('✅ Database synchronized');
    
    // Check if players already exist
    const existingCount = await Player.count();
    if (existingCount > 0) {
      console.log(`⚠️  ${existingCount} players already exist in database`);
      const shouldContinue = process.argv.includes('--force');
      if (!shouldContinue) {
        console.log('Use --force flag to import anyway');
        process.exit(0);
      }
    }
    
    // Import players
    const excelPath = path.join(__dirname, '..', 'MBPLSeason1.0.xlsx');
    if (!fs.existsSync(excelPath)) {
      console.error('❌ Excel file not found:', excelPath);
      process.exit(1);
    }
    
    console.log('�� Reading Excel file...');
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const headers = [
      'Rank', 'Latest Rating Points', 'Player Name', 'Initial Rating', 'Current Rating', 'Joining Date',
      'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'
    ];
    
    const rows = xlsx.utils.sheet_to_json(sheet, { header: headers, range: 1, defval: '' });
    console.log(`📈 Found ${rows.length} rows in Excel file`);
    
    const players = [];
    for (const row of rows) {
      const name = row['Player Name']?.toString().trim();
      const initialRating = Number(row['Initial Rating']);
      const currentRating = Number(row['Current Rating']);
      let joiningDate = row['Joining Date'];
      
      // Parse joining date
      if (typeof joiningDate === 'string' && joiningDate.match(/^\d{1,2}-[A-Za-z]{3}-\d{2}$/)) {
        const [day, mon, year] = joiningDate.split('-');
        const monthMap = { 
          Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', 
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' 
        };
        joiningDate = `20${year}-${monthMap[mon]}-${day.padStart(2, '0')}`;
      } else if (joiningDate instanceof Date) {
        joiningDate = joiningDate.toISOString().slice(0, 10);
      }
      
      if (name && !isNaN(initialRating) && !isNaN(currentRating) && joiningDate) {
        players.push({ name, initialRating, currentRating, joiningDate });
        console.log('✅ Valid player:', { name, initialRating, currentRating, joiningDate });
      } else {
        console.log('❌ Invalid row:', { name, initialRating, currentRating, joiningDate });
      }
    }
    
    if (players.length > 0) {
      await Player.bulkCreate(players);
      console.log(`✅ Successfully imported ${players.length} players`);
    } else {
      console.log('❌ No valid players found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

manualImportPlayers(); 