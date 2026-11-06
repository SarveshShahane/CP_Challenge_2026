import axios from "axios"

const BASE_URL: string = import.meta.env.VITE_BASE_URL

async function fetch_users() {
    const response = await axios.get(BASE_URL)
    return response
}

export { fetch_users }
