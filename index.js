const mqtt = require('mqtt')
const Influx = require('influx')
const client = mqtt.connect('mqtt://mqtt.werkstatt.diyww.de')

const influx = new Influx.InfluxDB({
  host: 'docker.werkstatt.diyww.de',
  database: 'diyww',
  schema: [
    {
      measurement: 'kuehlschrank',
      fields: {
        temperature: Influx.FieldType.FLOAT,
        humidity: Influx.FieldType.FLOAT,
        door: Influx.FieldType.BOOLEAN
      },
      tags: ['host']
    },
    {
      measurement: 'shopsystemstock',
      fields: {
        amount: Influx.FieldType.INTEGER,
        memberprice: Influx.FieldType.FLOAT,
        guestprice: Influx.FieldType.FLOAT
      },
      tags: ['ean','name','category']
    },
    {
      measurement: 'thermostate',
      fields: {
        temperature: Influx.FieldType.FLOAT,
        desired: Influx.FieldType.FLOAT,
        valve: Influx.FieldType.INTEGER
      },
      tags: ['room','valveNumber']
    }
  ]
})

influx.getDatabaseNames()
  .then(names => {
    if (!names.includes('diyww')) {
      return influx.createDatabase('diyww');
    }
  })

var subscribtionsObject = [
  { "topic": "diyww/shop/stockinfo", "handler" : handleShopsystem},
  { "topic": "diyww/lounge/kuehlschrank/kuehlschrank", "handler" : handleKuehlschrank},
  { "topic": "diyww/lounge/kuehlschrank/gefrierschrank", "handler" : handleGefrierschrank},
  { "topic": "diyww/+/thermostat/#", "handler" : handeThermostate}
]
var subscribtionHandleArray = []
subscribtionsObject.forEach(function (value) {
  subscribtionHandleArray[value.topic] = value.handler;
    //your iterator
})

console.log(subscribtionHandleArray)

client.on('connect', () => {
  console.log("connected");
  client.subscribe('#')
})

client.on('message', (topic, message, packet) => {
  if(subscribtionHandleArray[topic]){
    subscribtionHandleArray[topic](topic,message)
  } else {
    for(let row in subscribtionsObject){
      var regex = subscribtionsObject[row].topic.replace("+",".*").replace("#",".*");
      if(topic.match(regex)){
        subscribtionsObject[row].handler(topic,message);
      }
    }
  }
})

function handeThermostate(topic,message) {
  var msg = JSON.parse(message)
  var result = topic.match(.*\/(.*)\/thermostat\/([0-9]))
  var room = result[0]
  var valveNumber = result[1]
  console.log(msg)
  console.log(room)
  console.log(valveNumber)
  /*
   influx.writePoints([
      {
        measurement: 'thermostate',
        tags: { room: room, valveNumber: valveNumber},
        fields: { temperature: msg.temperature, desired: msg.desired, valve: msg.valve}
      }
    ]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })*/
}

function handleShopsystem(topic,message) {
  var msg = JSON.parse(message)
  msg.forEach(function (item) {
    influx.writePoints([
        {
          measurement: 'shopsystemstock',
          tags: { ean: item.ean, name: item.name, category: item.category },
          fields: { amount: item.amount, memberprice: item.memberprice, guestprice: item.guestprice}
        }
      ]).catch(err => {
        console.error(`Error saving data to InfluxDB! ${err.stack}`)
      })
  })
}

function handleKuehlschrank(topic,message) {
  var msg = JSON.parse(message)
  influx.writePoints([
      {
        measurement: 'kuehlschrank',
        tags: { host: 'kuehlschrank' },
        fields: { temperature: msg.temperature, humidity: msg.humidity, door: false}
      }
    ]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
}

function handleGefrierschrank(topic,message) {
  var msg = JSON.parse(message)
  influx.writePoints([
      {
        measurement: 'kuehlschrank',
        tags: { host: 'gefrierschrank' },
        fields: { temperature: msg.temperature, humidity: msg.humidity, door: false}
      }
    ]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
}
