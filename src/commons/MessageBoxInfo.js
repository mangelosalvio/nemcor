import React from 'react'
import isEmpty from '../validation/is-empty';

export default ({ message, onHide }) => {
  return (
    <div style={{ paddingBottom: '1rem' }}>
    { !isEmpty( message ) ? (
      <div className="notification is-success">
        <button className="delete" onClick={onHide}></button>
        { message }
      </div>  
    ) : null }
    </div>
    
  )
}
