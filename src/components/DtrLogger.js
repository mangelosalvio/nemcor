import React, { Component } from 'react';
import moment from 'moment';
import { NavLink } from 'react-router-dom';
import { connect } from 'react-redux';
import { addDtr } from './../actions/dtr';

class DtrLogger extends Component {
  
  state = {
    name : "Michael Angelo O. Salvio",
    time : moment().format('LTS'),
    date : moment().format('LL'),
    id_no : ''
  }

  interval = null;

  componentDidMount() {
    this.interval = setInterval(() => {
      this.setState(({ time :moment().format('LTS') }));
    },1000)
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }
  

  handleChange = (e) => {
    const value = e.target.value;

    if ( e.target.type === 'radio' ) {
      this.idNumberInput.focus();
    }
    
    this.setState(({
      [e.target.name] : value
    }));

  }

  onSubmit = (e) => {
    e.preventDefault();

    const form_data = {
      id_no : this.state.id_no,
      option : this.state.option
    }

    this.props.addDtr(form_data);
    this.setState(({ id_no : '' }));
  }

  constructor(props) {
    super(props)
  
    console.log(this.props.dtr);
  }
  
  
  
  render() {
    return (
      <form onSubmit={this.onSubmit}> 
        <div className="Aligner">
          <div className="Aligner-item">
          <div className="date-container">
              { this.state.date }
            </div>
            <div className="time-container">
              { this.state.time }
            </div>
            <div className='id-number-container'>
              <input type='text' placeholder='ID NUMBER' name='id_no' onChange={this.handleChange} autoComplete='off' value={this.state.id_no} ref={ (input) => this.idNumberInput = input } />
            </div>
            <div className='dtr-options-container'>
              <div className='control'>
                <label className='radio'>
                  <input type='radio' name='option' value='shift_in' onChange={this.handleChange} />
                  Shift In
                </label>
                <label className='radio'>
                  <input type='radio' name='option' value='lunch_out' onChange={this.handleChange} />
                  Lunch Out
                </label>
                <label className='radio'>
                  <input type='radio' name='option' value='lunch_in' onChange={this.handleChange} />
                  Lunch In
                </label>
                <label className='radio'>
                  <input type='radio' name='option' value='shift_out' onChange={this.handleChange} />
                  Shift Out
                </label>
              </div>
            </div>
            <div>
              <NavLink to='/summary' className='button is-link'>Summary</NavLink>
            </div>
            <div className="table-container">
              <table className='table is-fullwidth'>
                <caption>{this.props.dtr.id_no}</caption>
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>SHIFT IN</th>
                    <th>LUNCH OUT</th>
                    <th>LUNCH IN</th>
                    <th>SHIFT OUT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{this.props.dtr.dtr.date && moment(this.props.dtr.dtr.date).format('l') }</td>
                    <td>{this.props.dtr.dtr.shift_in && moment(this.props.dtr.dtr.shift_in).format('LTS')}</td>
                    <td>{this.props.dtr.dtr.lunch_out && moment(this.props.dtr.dtr.lunch_out).format('LTS')}</td>
                    <td>{this.props.dtr.dtr.lunch_in && moment(this.props.dtr.dtr.lunch_in).format('LTS')}</td>
                    <td>{this.props.dtr.dtr.shift_out && moment(this.props.dtr.dtr.shift_out).format('LTS')}</td>
                  </tr>
                </tbody>

              </table>
            </div>
          </div>
        </div>
      </form>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    dtr : state.dtr
  }
}

export default connect(mapStateToProps,{  addDtr })(DtrLogger)

