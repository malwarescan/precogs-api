// scripts/test-croutons.js
// Test script for Croutons endpoints
import { insertCrouton } from '../src/db.js';

async function insertTestData() {
  try {
    console.log('Inserting test Croutons...');
    
    // Insert sample croutons
    const crouton1 = await insertCrouton(
      'Python is the most popular programming language for data science',
      ['Python', 'data science', 'programming languages'],
      0.95,
      ['https://stackoverflow.com/survey/2023', 'https://towardsdatascience.com/python-data-science']
    );
    
    const crouton2 = await insertCrouton(
      'React was created by Jordan Walke at Facebook in 2013',
      ['React', 'Jordan Walke', 'Facebook', '2013'],
      0.98,
      ['https://reactjs.org/blog/2013/06/05/why-react.html']
    );
    
    const crouton3 = await insertCrouton(
      'The Earth orbits the Sun at an average distance of 149.6 million kilometers',
      ['Earth', 'Sun', 'astronomical unit', 'orbit'],
      0.99,
      ['https://nasa.gov/earth-orbit-sun']
    );

    console.log('Inserted test croutons:', {
      crouton1: crouton1.id,
      crouton2: crouton2.id,
      crouton3: crouton3.id
    });
    
    console.log('\nTest these endpoints:');
    console.log(`curl http://localhost:8080/v1/croutons/${crouton1.id}`);
    console.log(`curl http://localhost:8080/v1/croutons/${crouton1.id}.md`);
    console.log(`curl -H "Accept: text/markdown" http://localhost:8080/v1/croutons/${crouton1.id}`);
    console.log('curl http://localhost:8080/feeds/croutons.ndjson');
    
  } catch (error) {
    console.error('Error inserting test data:', error);
  }
}

insertTestData();
