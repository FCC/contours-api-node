# Contour API (Node.JS)
**System Requirements**: Node.JS v4
### setting up locally
1. Copy the env.json file from the Bamboo build plan (or AWS instructions below) from the config folder.

2. Install node modules.  
   ```
   npm install
   ```

3. Test the app.  
   ```
   npm test
   ```

4. Run the app.  
   ```
   npm start
   ```


### setting up in AWS
Before packaging our code we need to create the Elastic Beanstalk environment, as that URL is necessary as an environment variable in our zip. At creation, just deploy a sample application until we are ready to upload our zip. We recommend naming the environment with the Cloud DevOps Naming Convention of **system-project-technology-environment##**. An example for this repo would be **contour-api-node-at01**.

With the environment created, now we can download the code from the repo. Once we cd into it, we have to create the env.json for our environment variables, as well as the .ebextensions folder for our config file. After the config file is created, we can zip up all the files and upload the zip to our EB environment.

*NOTE: In the code below, applications are referred to by their names on the OPIF architecture diagram as placeholders; be sure to replace those with the proper information. Depending on the type of variable this application would be referred to as Contour Node, contour-node, or contour_node. For a full list of references, consult the diagram.*

```bash
git clone https://github.com/FCC/fcc-contour-node.git
cd fcc-contour-node
mkdir config
touch config/env.json
echo '{	
	"LOCAL": {
		"NODE_PORT": "9305",
		"GS_PATH": "http://contour-geoserv.elasticbeanstalk.com/"		
	},
	"DEV": {
		"NODE_PORT": "9305",
		"GS_PATH": "http://contour-geoserv.elasticbeanstalk.com/"
	},
	"TEST": {
		"NODE_PORT": "9305",
		"GS_PATH": "http://contour-geoserv.elasticbeanstalk.com/"
	},
	"ST":  {
		"NODE_PORT": "9305",
		"GS_PATH": "http://contour-geoserv.elasticbeanstalk.com/"
	},
	"AT":  {
		"NODE_PORT": "9305",
		"GS_PATH": "http://contour-geoserv.elasticbeanstalk.com/"
	},
	"PROD":  {
		"NODE_PORT": "9305",
		"GS_PATH": "http://contour-geoserv.elasticbeanstalk.com/"
	},
	"DEMO":  {
		"NODE_PORT": "9305",
		"GS_PATH": "http://contour-geoserv.elasticbeanstalk.com/"
	}
}' > config/env.json

mkdir .ebextensions
touch .ebextensions/environment.config
echo 'option_settings:
  - option_name: NODE_ENV
    value: AT' > .ebextensions/environment.config

zip -r contournode.zip .
```
