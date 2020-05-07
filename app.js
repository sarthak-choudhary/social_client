const express = require('express')
const path = require('path')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const neo4j = require('neo4j-driver')

const app = express()

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

const driver = neo4j.driver("bolt://localhost:11005", neo4j.auth.basic("neo4j", "iamboss02"))
const session = driver.session()

//Home Route
app.get('/', (req, res) => {
    session
        .run("MATCH (n:Person) RETURN n")
        .then((result) => {
            const personArr = [];
            result.records.forEach((record) => {
                console.log(record._fields[0])
                personArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                })
            })

            session
                .run("MATCH (n:Location) RETURN n")
                .then((result2) => {
                    const locationArr = [];
                    result2.records.forEach((record) => {
                        locationArr.push(record._fields[0].properties)
                    })

                    res.render('index', {
                        persons: personArr,
                        locations: locationArr
                })
        })
        .catch((error) => {
            console.log(error)
        })
    })
})

app.post('/person/add', (req, res) => {
    const name = req.body.name;
    session
        .run("CREATE(n:Person {name:$nameParam}) RETURN n", {nameParam: name})
        .then((result) => {
            res.redirect('/')
            
        })
        .catch((error) => {
            console.log(error)
        })
})

app.post('/location/add', (req, res) => {
    const city = req.body.city
    const state = req.body.state
    session
        .run("CREATE(n:Location {city:$cityParam, state:$stateParam}) RETURN n", {cityParam: city, stateParam: state})
        .then((result) => {
            res.redirect('/')
            
        })
        .catch((error) => {
            console.log(error)
        })
})

app.post('/friends/connect', (req, res) => {
    const name1 = req.body.name1
    const name2 = req.body.name2
    const id = req.body.id
    session
        .run("MATCH(a:Person {name:$nameParam1}), (b:Person {name: $nameParam2}) MERGE (a) -[r:FRIENDS]-> (b) RETURN a,b", {nameParam1: name1, nameParam2: name2})
        .then((result) => {
            if(id && id != null){
                res.redirect('/person/'+id)
            } else{
                res.redirect('/')
            }
            
        })
        .catch((error) => {
            console.log(error)
        })
})

app.post('/person/born/add', (req, res) => {
    const name = req.body.name
    const city = req.body.city
    const state = req.body.state
    const year = req.body.year
    const id = req.body.id
    session
        .run("MATCH(a:Person {name:$nameParam}), (b:Location {city: $cityParam, state: $stateParam}) MERGE (a) -[r:BORN_IN {year: $yearParam}]-> (b) RETURN a,b", {nameParam: name, cityParam: city, stateParam: state, yearParam: year})
        .then((result) => {
            if(id && id != null){
                res.redirect('/person/'+id)
            } else{
                res.redirect('/')
            }
            
        })
        .catch((error) => {
            console.log(error)
        })
}) 

app.get('/person/:id', (req, res) => {
    const id = req.params.id

    session
        .run("MATCH (a:Person) WHERE id(a)=toInteger($idParam) RETURN a.name as name", {idParam: id})
        .then((result) => {
            const name=result.records[0].get("name")

            session
                .run("OPTIONAL MATCH (a:Person)-[r:BORN_IN]-(b:Location) WHERE id(a)=toInteger($idParam) RETURN b.city as city, b.state as state", {idParam: id})
                .then((result2) => {
                    const city = result2.records[0].get("city")
                    const state = result2.records[0].get("state")

                    session
                        .run("OPTIONAL MATCH (a:Person)-[r:FRIENDS]-(b:Person) WHERE id(a)=toInteger($idParam) RETURN b", {idParam: id})
                        .then((result3) => {
                            const friendArr = []

                            result3.records.forEach((record) => {
                                if(record._fields[0] != null) {
                                    friendArr.push({
                                        id: record._fields[0].identity.low,
                                        name: record._fields[0].properties.name
                                    })
                                }
                            })

                            res.render('person', {
                                id: id,
                                name: name,
                                city: city,
                                state: state,
                                friends: friendArr
                            })
                        })
                        .catch((error) => {
                            console.log(error)
                        })
                })
        })
    
})


app.listen(3000)

console.log('Server started on 3000')

module.exports = app