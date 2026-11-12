import { publicProjects } from '../src/data/projects';
import { validateProjectRecords } from '../src/repositories/projectRepository';

validateProjectRecords(publicProjects);
console.log(`Validated ${publicProjects.length} public project record(s).`);
