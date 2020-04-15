// (function(window){
// window.extractData = function() {
//   var ret = $.Deferred();

//   function onError() {
//     console.log('Loading error', arguments);
//     ret.reject();
//   }

//   function onReady(smart)  {
//     console.log(smart);
//     if (smart.hasOwnProperty('patient')) {
//       var patient = smart.patient;
//       var pt = patient.read();
//       var obv = smart.patient.api.fetchAll({
//                   type: 'Observation',
//                   query: {
//                     code: {
//                       $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
//                             'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
//                             'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
//                     }
//                   }
//                 });

//       $.when(pt, obv).fail(onError);

//       $.when(pt, obv).done(function(patient, obv) {
//         var byCodes = smart.byCodes(obv, 'code');
//         var gender = patient.gender;

//         var fname = '';
//         var lname = '';

//         if (typeof patient.name[0] !== 'undefined') {
//           fname = patient.name[0].given.join(' ');
//           lname = patient.name[0].family.join(' ');
//         }

//         var height = byCodes('8302-2');
//         var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
//         var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
//         var hdl = byCodes('2085-9');
//         var ldl = byCodes('2089-1');

//         var p = defaultPatient();
//         p.birthdate = patient.birthDate;
//         p.gender = gender;
//         p.fname = fname;
//         p.lname = lname;
//         p.height = getQuantityValueAndUnit(height[0]);

//         if (typeof systolicbp != 'undefined')  {
//           p.systolicbp = systolicbp;
//         }

//         if (typeof diastolicbp != 'undefined') {
//           p.diastolicbp = diastolicbp;
//         }

//         p.hdl = getQuantityValueAndUnit(hdl[0]);
//         p.ldl = getQuantityValueAndUnit(ldl[0]);

//         ret.resolve(p);
//       });
//     } else {
//       onError();
//     }
//   }

//   FHIR.oauth2.ready(onReady, onError);
//   return ret.promise();
// };
var getData = function (client) {
  if (client.hasOwnProperty('patient')) {
    var pt = client.patient.read();
    // var obv = client.patient.request('Observation');
    var query = new URLSearchParams();
    query.set("patient", client.patient.id);
    query.set("_count", 100); // Try this to fetch fewer pages
    query.set("code", [
        'http://loinc.org|29463-7', // weight
        'http://loinc.org|3141-9' , // weight
        'http://loinc.org|8302-2' , // Body height
        'http://loinc.org|8306-3' , // Body height --lying
        'http://loinc.org|8287-5' , // headC
        'http://loinc.org|39156-5', // BMI 39156-5
        'http://loinc.org|18185-9', // gestAge
        'http://loinc.org|37362-1', // bone age
        'http://loinc.org|11884-4'  // gestAge
    ].join(","));
    var obv = client.request("Observation?" + query, {
        pageLimit: 0,   // get all pages
        flat     : true // return flat array of Observation resources
    });

    Promise.all([pt, obv]).then(function (values) {
      var [patient, obv] = values;
      console.log(patient);
      console.log(obv);
      var byCodes = client.byCodes(obv, 'code');
      var gender = patient.gender;

      console.log('byCodes:');
      console.log(byCodes("29463-7"));
      console.log(byCodes("2345-7"));

      var fname = '';
      var lname = '';

      if (typeof patient.name[0] !== 'undefined') {
        fname = patient.name[0].given.join(' ');
        lname = patient.name[0].family.join(' ');
      }

      var height = byCodes('8302-2');
      var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
      var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
      var hdl = byCodes('2085-9');
      var ldl = byCodes('2089-1');

      var p = defaultPatient();
      p.birthdate = patient.birthDate;
      p.gender = gender;
      p.fname = fname;
      p.lname = lname;
      p.height = getQuantityValueAndUnit(height[0]);

      if (typeof systolicbp != 'undefined') {
        p.systolicbp = systolicbp;
      }

      if (typeof diastolicbp != 'undefined') {
        p.diastolicbp = diastolicbp;
      }

      p.hdl = getQuantityValueAndUnit(hdl[0]);
      p.ldl = getQuantityValueAndUnit(ldl[0]);

      drawVisualization(p);
    })
  }
};

function defaultPatient() {
  return {
    fname: { value: '' },
    lname: { value: '' },
    gender: { value: '' },
    birthdate: { value: '' },
    height: { value: '' },
    systolicbp: { value: '' },
    diastolicbp: { value: '' },
    ldl: { value: '' },
    hdl: { value: '' },
  };
}

function getBloodPressureValue(BPObservations, typeOfPressure) {
  var formattedBPObservations = [];
  BPObservations.forEach(function (observation) {
    var BP = observation.component.find(function (component) {
      return component.code.coding.find(function (coding) {
        return coding.code == typeOfPressure;
      });
    });
    if (BP) {
      observation.valueQuantity = BP.valueQuantity;
      formattedBPObservations.push(observation);
    }
  });

  return getQuantityValueAndUnit(formattedBPObservations[0]);
}

function getQuantityValueAndUnit(ob) {
  if (typeof ob != 'undefined' &&
    typeof ob.valueQuantity != 'undefined' &&
    typeof ob.valueQuantity.value != 'undefined' &&
    typeof ob.valueQuantity.unit != 'undefined') {
    return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
  } else {
    return undefined;
  }
}

window.drawVisualization = function (p) {
  $('#holder').show();
  $('#loading').hide();
  $('#fname').html(p.fname);
  $('#lname').html(p.lname);
  $('#gender').html(p.gender);
  $('#birthdate').html(p.birthdate);
  $('#height').html(p.height);
  $('#systolicbp').html(p.systolicbp);
  $('#diastolicbp').html(p.diastolicbp);
  $('#ldl').html(p.ldl);
  $('#hdl').html(p.hdl);
};

// })(window);
