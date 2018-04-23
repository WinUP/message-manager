var { BaseComponent, ResourceManager } = require('./dist');

console.log(BaseComponent.configKeys);
console.log(JSON.stringify(BaseComponent.config));
console.log(JSON.stringify(ResourceManager.config));
console.log(JSON.stringify(ResourceManager.configKeys));
