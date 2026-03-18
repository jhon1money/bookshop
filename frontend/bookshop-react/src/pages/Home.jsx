import {useEffect, useState} from "react"
import BookCard from "../components/BookCard"
import {getBooks} from "../services/api"

function Home(){

  const [books,setBooks] = useState([])

  useEffect(()=>{

    async function loadBooks(){

      const data = await getBooks()

      setBooks(data)

    }

    loadBooks()

  },[])

  return(

    <div className="container">

      <h1>BookShop</h1>

      <div className="books-grid">

        {books.map((book)=>(
          <BookCard key={book.id} book={book}/>
        ))}

      </div>

    </div>

  )

}

export default Home