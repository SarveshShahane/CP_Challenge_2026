const BASE_URL :string = import.meta.env.VITE_BASE_URL
import axios from "axios"



async function fetch_users(){
    const response = await axios.get(BASE_URL)
    console.log(response)
}
export {fetch_users}