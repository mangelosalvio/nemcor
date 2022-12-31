import React, { Component } from 'react'
import TextFieldGroup from '../../commons/TextFieldGroup';
import Navbar from '../Navbar';
import axios from 'axios';
import isEmpty from '../../validation/is-empty'
import MessageBoxInfo from '../../commons/MessageBoxInfo';
import Searchbar from '../../commons/Searchbar';


class Tables extends Component {

  state = {
    url : '/api/tables/',
    search_keyword : '',
    errors : {},
    tables : [],
    _id : '',
    name :  ''
  }

  onChange = (e) => {
    this.setState({ [e.target.name] : e.target.value })
  }

  onSubmit = (e) => {
    e.preventDefault();
    
    const form_data = {
      name : this.state.name
    }

    if ( isEmpty(this.state._id) ) {
      axios.put(this.state.url, form_data)
        .then( ({data}) => this.setState({
          name : data.name,
          _id : data._id,
          errors : {},
          message : 'Transaction Saved'
        }) ) 
        .catch( err => this.setState( {errors : err.response.data }) );
    } else {
      axios.post(this.state.url + this.state._id, form_data)
        .then( ({data}) => this.setState({
          name : data.name,
          _id : data._id,
          errors : {},
          message : 'Transaction Updated'
        }) ) 
        .catch( err => this.setState( { errors : err.response.data } ) );
    }
    
  }
  
  onSearch = (e) => {
    e.preventDefault();

    axios.get(this.state.url + "?s=" + this.state.search_keyword)
      .then( response => this.setState({ 
        tables : response.data,
        message: isEmpty( response.data ) ? 'No rows found' : ''
      }) )
      .catch( err => console.log(err) );
  }

  addNew = () => {

    this.setState({ 
      tables : [],
      name : '',
      _id : null,
      errors : {},
      message : ''
    });
  }

  edit = ({name, _id}) => {
    this.setState({
      name,
      _id,
      tables : []
    })
  }

  onDelete = () => {
    axios.delete(this.state.url + this.state._id)
      .then( response => {
        this.setState({
          _id : '',
          name : '',
          message : 'Transaction Deleted'
        })
      } )
      .catch( err => console.log(err));
  }

  onHide = () => {
    this.setState({message : ''})
  }

  render() {

    const {errors} = this.state;

    return (
      <div>
        <Navbar />
        
        <Searchbar name='search_keyword' onSearch={this.onSearch} onChange={this.onChange} value={this.state.search_keyword} />      

        <div className='container box' style={{marginTop: '1rem'}}>
          <span className='is-size-5'>Tables</span> <button className='button is-small' onClick={this.addNew}>Add New</button>
          <hr />

          <MessageBoxInfo
            message={this.state.message}
            onHide={this.onHide} />

          { isEmpty(this.state.tables) ? (
            <form  onSubmit={this.onSubmit}>
              <div>
                <TextFieldGroup
                  label='Table Name'
                  name='name'
                  value={this.state.name}
                  onChange={this.onChange}
                  error={errors.name}
                  />
                  <div className='field is-grouped'>
                    <div className='control'>
                        <button className='button is-primary'>Save</button>
                    </div>

                    { !isEmpty( this.state._id ) ? (
                       <a className="button is-danger is-outlined" onClick={this.onDelete}>
                          <span>Delete</span>
                          <span className="icon is-small">
                          <i className="fas fa-times"></i>
                          </span>
                        </a> 
                    ) : null }
                    
                  </div>
              </div>
            </form>
          )  : (
            <table className='table is-fullwidth is-striped is-hoverable'>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Table Name</th>
                </tr>
              </thead>
              <tbody>
                { this.state.tables.map( (table, index) => (
                  <tr key={table._id} onClick={ () => this.edit(table)}>
                    <td>{ index + 1 }</td>
                    <td>{ table.name }</td>
                  </tr>
                ) ) }
              </tbody>
            </table>
          ) }  
          
        </div>

        
      </div>
    )
  }
}

export default Tables;