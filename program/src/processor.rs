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
                
                assert_with_msg(
                    echo_ai.is_writable && echo_ai.data_len() != 0,
                    ProgramError::InvalidArgument,
                    "The Passed in echo buffer was not initialized properly.",
                )?;

                let min_len = cmp::min(data.len(), echo_ai.data_len());
                
                let buffer = &mut echo_ai.try_borrow_mut_data()?; 

                for byte in buffer.iter() {
                    if *byte != 0 {
                        return Err(EchoError::EchoBufferNotEmpty.into());
                    }
                }

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

                let pda_buffer = next_account_info(accounts_iter)?; // ai is for accountInfo
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
                        authority.key.as_ref(),
                        &buffer_seed.to_le_bytes()
                ],
                    program_id,
                );

                assert_with_msg(
                    auth_key == *pda_buffer.key,
                    ProgramError::InvalidArgument,
                    "Invalid PDA seeds for authority, malicious activity suspected :O",
                )?;

                invoke_signed(
                    &system_instruction::create_account(
                        authority.key, 
                        pda_buffer.key, 
                        Rent::get()?.minimum_balance(buffer_size),
                        buffer_size.try_into().unwrap(),
                        program_id),
                    &[authority.clone(), pda_buffer.clone(), system_program.clone()],
                    &[&[
                    authority.key.as_ref(),
                    &buffer_seed.to_le_bytes(), &[bump_seed]]],
                )?;

                let buffer = &mut pda_buffer.try_borrow_mut_data()?;
                
                buffer[0] = bump_seed;
                buffer[1..9].clone_from_slice(&buffer_seed.to_le_bytes());
                
                assert_with_msg(
                    buffer[0] == bump_seed && buffer[1..9] == buffer_seed.to_le_bytes(),
                    ProgramError::InvalidArgument,
                    "The buffer was not correctly initialized",
                )?;
                
                Ok(())
            }
            EchoInstruction::AuthorizedEcho { data } => {
                msg!("Instruction: AuthorizedEcho");

                let pda_buffer = next_account_info(accounts_iter)?; // ai is for accountInfo
                let authority = next_account_info(accounts_iter)?;

                assert_with_msg(
                    authority.is_signer,
                    ProgramError::InvalidArgument,
                    "The authority was not a signer",
                )?;

                msg!("Going for the first borrow");

                let buffer = &mut pda_buffer.try_borrow_mut_data()?;

                msg!("Here is the second borrow");

                let (_auth_key, bump_seed) = Pubkey::find_program_address(
                    &[
                        authority.key.as_ref(),
                        buffer[1..9].as_ref()// Should be buffer key
                ],
                    program_id,
                );

                assert_with_msg(
                    buffer.len() > 0,
                    ProgramError::InvalidArgument,
                    "The buffer pda was not adequately initialized",
                )?; 

                assert_with_msg(
                    bump_seed == buffer[0],
                    ProgramError::InvalidArgument,
                    "The passed account was not a real authority",
                )?;
                
                // If we get here, then sure we can write


                let min_len = cmp::min(data.len(), buffer.len() - 9);
                

                for i in 9..min_len {
                    buffer[i] = data[i - 9];
                }

                Ok(())
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
