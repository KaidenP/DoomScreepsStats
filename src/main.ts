import {ScreepsAPI} from "screeps-api";
import graphite from "graphite";
import * as fs from "fs";
import path from "node:path";
const conf = JSON.parse(fs.readFileSync(path.join(path.dirname(process.argv[1]), '../screeps.json'), {encoding:"utf-8"}))

const api = new ScreepsAPI(conf);
(async function (){
    const client = graphite.createClient(process.env.GRAPHITE_URL as string)

    await api.socket.connect()
    await api.socket.subscribe('console', async (evt: any) => {
        if (!conf.shards.includes(evt.data.shard)) return
        let statData: any[] = []
        if (Array.isArray(evt?.data?.messages?.results)) {
            evt.data.messages.results.forEach((data: any) => {
                try {
                    data = JSON.parse(data)
                    if (data.type !== 'stats') return
                    Object.keys(data).forEach(key=>{
                        if (key === 'type') return
                        let stat:any = {}
                        stat[evt.data.shard] = data[key]
                        stat.time = key
                        statData.push(stat)
                    })
                } catch {}
            })
        }
        if (statData.length===0) return
        let promises: Promise<void>[] = []
        statData.forEach(stat=>{
            let p = new Promise<void>((resolve, reject)=>{
                let time = stat.time
                delete stat.time
                client.write(stat, time, err=>{
                    if (err === null) resolve()
                    reject(err)
                })
            })
            promises.push(p)
        })
        await Promise.all<void>(promises)
        console.log(`Uploaded ${statData.length} stats`)
    })

    conf.shards.forEach((shard: string)=>api.console('getStats()', shard))
    setInterval(()=>{
        conf.shards.forEach((shard: string)=>api.console('getStats()', shard))
    }, 60000)
})()