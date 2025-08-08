import { Database } from 'lucide-react'

const Navbar = () => {
  return (
    <nav className="bg-gray-900 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <a href="https://byteloom.ai/" className="text-2xl font-bold text-white flex items-center">
                <Database className="mr-2 text-byteloom-blue" size={24} />
                ByteLoom
              </a>
            </div>
          </div>
          <div className="hidden md:block ml-10">
            <div className="flex w-full justify-center items-center space-x-4">
              <a
                href="https://byteloom.ai/create-connection"
                className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Connection
              </a>
              <a
                href="https://byteloom.ai/odoo-user-guide"
                className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Guide
              </a>
              <a
                href="https://byteloom.ai/about-us"
                className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                About Us
              </a>
              <a
                href="https://byteloom.ai/contact-us"
                className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Contact Us
              </a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://byteloom.ai/login"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Log in
            </a>
            <a href="https://byteloom.ai/signup">
              <button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Start for free
              </button>
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
