use borsh::{BorshDeserialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo}, 
    entrypoint::ProgramResult, 
    msg, 
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    program::{invoke_signed},
    system_program::ID as SYSTEM_PROGRAM_ID,
    sysvar::{rent::Rent, Sysvar},

};

use std::cmp;
use crate::error::EchoError;
use crate::instruction::EchoInstruction;

pub struct Processor {}

pub fn assert_with_msg(statement: bool, err: ProgramError, msg: &str) -> ProgramResult {
    if !statement {
        msg!(msg);
        Err(err)
    } else {
        Ok(())
    }
}

impl Processor {
    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = EchoInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        let accounts_iter = &mut accounts.iter();

        match instruction {
            EchoInstruction::Echo { data } => {
                msg!("Instruction: Echo");
                let echo_ai = next_account_info(accounts_iter)?; // ai is for accountInfo

                let buffer = &mut echo_ai.try_borrow_mut_data()?; 

                for byte in buffer.iter() {
                    if *byte != 0 {
                        return Err(EchoError::EchoBufferNotEmpty.into());
                    }
                }

                let min_len = cmp::min(data.len(), echo_ai.data_len());

                for i in 0..min_len {
                    buffer[i] = data[i];
                }
                
                Ok(())
            }

            EchoInstruction::InitializeAuthorizedEcho {
                buffer_seed,
                buffer_size,
            } => {
                msg!("Instruction: InitializeAuthorizedEcho");

                let authed_buffer = next_account_info(accounts_iter)?; // ai is for accountInfo
                let authority = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                // error check 
                assert_with_msg(
                    *system_program.key == SYSTEM_PROGRAM_ID,
                    ProgramError::InvalidArgument,
                    "Invalid passed in for system program",
                )?;
                
                let (auth_key, bump_seed) = Pubkey::find_program_address(
                    &[
                        b"authority",
                        authority.key.as_ref(),
                        &buffer_seed.to_le_bytes()
                ],
                    program_id,
                );

                // error check
                assert_with_msg(
                    auth_key == *authority.key,
                    ProgramError::InvalidArgument,
                    "Invalid PDA seeds for authority, malicious activity suspected :O",
                )?;

                invoke_signed(
                    &system_instruction::create_account(
                        authed_buffer.key, 
                        &auth_key, 
                        Rent::get()?.minimum_balance(buffer_size),
                        buffer_size.try_into().unwrap(), 
                        program_id), 
                    &[authed_buffer.clone(), authority.clone(), system_program.clone()],
                    &[&[auth_key.as_ref(), &[bump_seed]]],
                )?;



                let buffer = &mut authed_buffer.try_borrow_mut_data()?;
            
                for i in 0..buffer.len() {
                    if i == 0 {
                        buffer[i] = bump_seed;
                    } else {
                        buffer[i] = buffer_seed.try_into().unwrap();
                    }
                }
                Ok(())
            }
            EchoInstruction::AuthorizedEcho { data: _ } => {
                msg!("Instruction: AuthorizedEcho");

                // Here is where we'll use invokeSigned()
                Err(EchoError::NotImplemented.into())
            }
            EchoInstruction::InitializeVendingMachineEcho {
                price: _,
                buffer_size: _,
            } => {
                msg!("Instruction: InitializeVendingMachineEcho");
                Err(EchoError::NotImplemented.into())
            }
            EchoInstruction::VendingMachineEcho { data: _ } => {
                msg!("Instruction: VendingMachineEcho");
                Err(EchoError::NotImplemented.into())
            }
        }
    }

}
