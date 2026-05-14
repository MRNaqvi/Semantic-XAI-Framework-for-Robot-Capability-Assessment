using Keras.Datasets;
using System;
using Numpy;
using Keras.Models;
using Keras.Layers;
using Keras.PreProcessing.sequence;
using Keras.PreProcessing.Text;
using System.Linq;

namespace RdfoxWebApi
{
    public class ModelPredictor
    {
        private BaseModel _model;

        public ModelPredictor(string modelPath)
        {
            try
            {
                _model = BaseModel.LoadModel(modelPath);

            }
            catch(Exception ex) {
            
            Console.WriteLine(ex.Message);
            }
        }

        public NDarray Predict(NDarray input)
        {
            try
            {
                return _model.Predict(input);
            }
            catch(Exception ex) {

                Console.WriteLine(ex.Message);
                return null;
            }
         
        }
        public NDarray PrepareInput(float[] inputData)
        {
            // Convert the input data into the shape expected by the model
            // Adjust the shape as required by your specific model
            var npInput = np.array(inputData).reshape(1, inputData.Length);
            return npInput;
        }

    }
}
