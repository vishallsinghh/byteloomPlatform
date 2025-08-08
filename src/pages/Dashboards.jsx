// File: /pages/Dashboards.jsx

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IoAdd } from 'react-icons/io5'
import { FiTrash2, FiEdit } from 'react-icons/fi'
import Navbar from '../components/Navbar'
import { authUrl, url } from '../config'
import Swal from 'sweetalert2';
import { toast, ToastContainer } from "react-toastify";


const Dashboards = () => {
  const navigate = useNavigate()
  const [allDashboards, setAllDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboards()
  }, [])

  const fetchDashboards = async () => {
    const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("Auth Error: No access token found.");
        return;
      }
    
      const dbToken = localStorage.getItem("db_token");
      if (!dbToken) {
        toast.error("Auth Error: No DB token found.");
        return;
      }
    try {
      const res = await fetch(`${authUrl.BASE_URL}/dashboard/layout/info`,{
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
      }})
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
    console.log("Fetched dashboards:", data)
      setAllDashboards(data.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load dashboards.')
    } finally {
      setLoading(false)
    }
  }

const deleteDashboard = async (id, dashboardName) => {
  const { isConfirmed } = await Swal.fire({
    title: 'Delete Dashboard?',
    text: `Are you sure you want to delete "${dashboardName}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it',
    cancelButtonText: 'Cancel',
  })
  if (!isConfirmed) return

  const token = localStorage.getItem("accessToken");
  if (!token) {
    toast.error("Auth Error: No access token found.");
    return;
  }

  try {
    const resp = await fetch(`${authUrl.BASE_URL}/dashboard/delete/layout/${id}`, { 
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
    if (!resp.ok) throw new Error(`Status ${resp.status}`)
    await Swal.fire('Deleted!', 'Your dashboard has been deleted.', 'success')
    fetchDashboards()
  } catch (err) {
    console.error('Delete failed:', err)
    Swal.fire('Error', 'Could not delete the dashboard.', 'error')
  }
}
  const skeletonCount = 4

  return (
    <>
      <Navbar />
      <div className="p-3 mt-[55px] md:p-6 w-full h-[calc(100vh-55px)]">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={i}
                className="border border-gray-300 p-6 rounded-lg bg-gray-200 animate-pulse h-64"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            <Link to="/create-dashboard">
              <div className="border border-dashed border-gray-300 p-6 rounded-lg bg-gray-100 cursor-pointer hover:scale-105 duration-200 group shadow-md flex items-center justify-center sm:h-[200px] w-full md:h-64">
                <IoAdd
                  className="text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-800 duration-200 ease-in-out rounded-full"
                  size={60}
                />
              </div>
            </Link>

            {allDashboards.map((d) => (
              <Link key={d.id} to={`/view-dashboard?id=${d.id}`}>
                <div className="border border-dashed relative border-gray-300 z-10 p-6 rounded-lg bg-gray-100 flex items-center justify-center group shadow-md cursor-pointer hover:scale-105 duration-200 sm:h-[200px] w-full md:h-64">
                  {/* Edit button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      navigate(`/edit-dashboard?id=${d.id}`)
                    }}
                    className="p-2 m-2 rounded absolute top-3 right-12 hover:bg-gray-200"
                    title="Edit Dashboard"
                  >
                    <FiEdit size={20} className="text-gray-600" />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deleteDashboard(d.id, d.name)
                    }}
                    className="p-2 m-2 rounded absolute top-3 right-3 hover:bg-gray-200"
                    title="Delete Dashboard"
                  >
                    <FiTrash2 size={20} className="text-gray-600" />
                  </button>

                  <span className="text-2xl font-bold first-letter:uppercase text-center text-gray-800">
                    {d.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default Dashboards
