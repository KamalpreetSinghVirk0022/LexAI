import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://saufwspqccvfkmqimiyw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdWZ3c3BxY2N2ZmttcWltaXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODgzNzUsImV4cCI6MjA5MzQ2NDM3NX0.QkcG3pe2TmXFVrxOSY25RWuSxCphAoCcadIyViF9CVw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSignup() {
  const email = `testuser_${Date.now()}@example.com`
  console.log(`Attempting signup with ${email}...`)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'TestPassword123!',
    options: {
      data: { full_name: 'Test User' },
    },
  })

  if (error) {
    console.error("SIGNUP FAILED:", error.message)
    console.error(error)
  } else {
    console.log("SIGNUP SUCCESS:", data)
  }
}

testSignup()
