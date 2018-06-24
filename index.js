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
  {"topic": "diyww/shop/stockinfo", "handler" : handleShopsystem},
  {"topic": "diyww/lounge/kuehlschrank/kuehlschrank", "handler" : handleKuehlschrank},
  {"topic": "diyww/lounge/kuehlschrank/gefrierschrank", "handler" : handleGefrierschrank}
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

client.on('message', (topic, message) => {
  if(subscribtionHandleArray[topic]){
    subscribtionHandleArray[topic](message)
  }
})

function handleShopsystem(message) {
  var msg = JSON.parse(message)
  msg.forEach(function (item) {
    console.log(item)
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

function handleKuehlschrank(message) {
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

function handleGefrierschrank(message) {
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