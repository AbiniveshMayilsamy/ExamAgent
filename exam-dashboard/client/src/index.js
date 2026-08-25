import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App'

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const apiUrl = process.env.REACT_APP_API_URL

if (isLocalhost && (!apiUrl || apiUrl.includes('vercel.app'))) {
  axios.defaults.baseURL = 'http://localhost:5000'
} else if (apiUrl) {
  axios.defaults.baseURL = apiUrl
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<React.StrictMode><App /></React.StrictMode>)
