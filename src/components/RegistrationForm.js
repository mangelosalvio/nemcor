import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { connect } from 'react-redux'
import TextFieldGroup from '../commons/TextFieldGroup';

class RegistrationForm extends Component {

    state = {
        errors : {},
        name : '',
        username : '',
        password : ''
    }

    onChange = (e) => {
        this.setState(({ [e.target.name]  : e.target.value }));
    }

    onSubmit = (e) => {
        e.preventDefault();
        console.log("here");

        axios.post('/api/users/register', this.state)
            .then(({data}) => {
                this.setState({errors : {}})
            })
            .catch((error) => {
                this.setState({ errors : error.response.data });
            })
    }

    componentDidMount() {
        if ( this.props.auth.isAuthenticated ) {
            this.props.history.push("/");
        }
    }
    
    

    render() {

        const {errors} = this.state;
        return (
        <div className='container'>
            <form className='columns' onSubmit={this.onSubmit}>
                <div className='column is-half is-offset-one-quarter'>
                    <TextFieldGroup
                        label='Username'
                        name='username'
                        value={this.state.username}
                        onChange={this.onChange}
                        error={errors.username} />


                    <TextFieldGroup 
                        label='Name'
                        name='name'
                        value={this.state.name}
                        onChange={this.onChange}
                        error={errors.name}
                        />

                    <TextFieldGroup 
                        label='Password'
                        name='password'
                        type='password'
                        value={this.state.password}
                        onChange={this.onChange}
                        error={errors.password}
                        />

                    <div className='field is-grouped'>
                        <div className='control'>
                            <button className='button is-primary'>Register</button>
                        </div>
                        <div className='control'>
                            <NavLink to="/" className='button is-text'>Cancel</NavLink>
                        </div>
                    </div>
                </div>

                
            </form>
        </div>
        )
    }
}

const mapStateToProps = (state) => {
    return { 
        auth : state.auth
    }
}

export default connect(mapStateToProps)(RegistrationForm);
