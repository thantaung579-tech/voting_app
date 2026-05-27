import mysql from 'mysql2/promise';

const candidates = [
  {
    name: "Aung San",
    description: "Experienced leader with a vision for progress and innovation",
    photoKey: "candidate_1_64ee6b14.jpg"
  },
  {
    name: "Daw Aung",
    description: "Community advocate focused on education and development",
    photoKey: "candidate_2_08895347.jpg"
  },
  {
    name: "Kyaw Soe",
    description: "Technology enthusiast dedicated to digital transformation",
    photoKey: "candidate_3_e981d1bf.jpg"
  },
  {
    name: "Myo Thant",
    description: "Environmental champion committed to sustainable practices",
    photoKey: "candidate_4_7a6ef772.jpg"
  },
  {
    name: "Soe Win",
    description: "Youth representative bringing fresh perspectives to leadership",
    photoKey: "candidate_5_93e20cba.jpg"
  }
];

async function seedCandidates() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    for (const candidate of candidates) {
      const query = 'INSERT INTO candidates (name, description, photoKey) VALUES (?, ?, ?)';
      await connection.execute(query, [candidate.name, candidate.description, candidate.photoKey]);
      console.log(`✓ Added candidate: ${candidate.name}`);
    }
    console.log('\n✓ All candidates seeded successfully!');
  } catch (error) {
    console.error('Error seeding candidates:', error);
  } finally {
    await connection.end();
  }
}

seedCandidates();
