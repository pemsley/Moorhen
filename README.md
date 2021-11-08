1. Install emscripten following:  
https://emscripten.org/docs/getting_started/downloads.html  
Do not forget the final step (as I did!):  
`./emsdk activate latest`

2. Each time you want to use emscripten:  
`source ./emsdk_env.sh`

3. Build the CCP4 libraries and example:  
`emcmake cmake .`  
`emmake make`

4. Run the example:  
`cd example`  
`node ccp4_example.js`

5. To run the web example, put the contents of the `web_example` directory on a web server.\
This can be a full-scale web server, or a simple one, e.g:
`cd web_example`  
`python3 -m http.server 7800 &`\
And then point a web browser at `http://localhost:7800/test.html` .
